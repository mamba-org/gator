"""Pytest configuration for mamba_gator tests.

This module configures pytest-jupyter fixtures for server-based testing.
"""

import json
import os
import sys

import pytest
from tornado.httpclient import HTTPClientError

from mamba_gator.handlers import NS

pytest_plugins = ["pytest_jupyter.jupyter_server"]


TIMEOUT = 150
SLEEP = 1


@pytest.fixture
def jp_server_config(jp_server_config):
    """Configure the server to load mamba_gator extension."""
    jp_server_config["ServerApp"]["jpserver_extensions"] = {"mamba_gator": True}
    return jp_server_config


@pytest.fixture
def conda_fetch(jp_fetch, jp_base_url):
    """Wrapper around jp_fetch with longer timeout for conda operations.
    
    Supports a 'params' keyword argument for query parameters.
    Query params are added to the URL after path construction to avoid 
    double URL-encoding.
    """
    from urllib.parse import urlencode, urljoin
    from tornado.httpclient import AsyncHTTPClient, HTTPRequest
    from jupyter_server.utils import url_path_join
    
    async def _fetch(*args, **kwargs):
        # Set a longer timeout for conda operations (default 20s is too short)
        if "request_timeout" not in kwargs:
            kwargs["request_timeout"] = 120
        
        # Handle query parameters separately to avoid URL encoding issues
        params = kwargs.pop("params", None)
        
        if params:
            # Build URL manually to add query params without double-encoding
            # Get the path from args
            path = url_path_join(*args) if args else ""
            # Construct full URL with query string (not URL-encoded)
            full_url = url_path_join(jp_base_url, path) + "?" + urlencode(params)
            
            # Make request directly with tornado
            client = AsyncHTTPClient()
            request = HTTPRequest(
                full_url,
                method=kwargs.get("method", "GET"),
                body=kwargs.get("body"),
                request_timeout=kwargs.get("request_timeout", 120),
                headers=kwargs.get("headers"),
            )
            return await client.fetch(request, raise_error=True)
        else:
            return await jp_fetch(*args, **kwargs)
    return _fetch


@pytest.fixture
def wait_for_task(conda_fetch):
    """Fixture to wait for async conda tasks to complete.
    
    Returns a function that polls a task endpoint until it completes.
    """
    import asyncio

    async def _wait(location):
        """Wait for a task at the given location to complete.
        
        Args:
            location: The Location header from a 202 response, or task path
            
        Returns:
            The final response when task completes
            
        Raises:
            RuntimeError: If task times out
        """
        # Extract task path from location header
        if location.startswith("/" + NS):
            location = location[len(NS) + 2:]  # +2 for leading slash and trailing slash
        
        # Remove leading slash if present
        if location.startswith("/"):
            location = location[1:]
        
        for _ in range(TIMEOUT):
            response = await conda_fetch(NS, location, method="GET")
            if response.code != 202:
                return response
            await asyncio.sleep(SLEEP)
        
        raise RuntimeError(f"Task {location} timed out")

    return _wait


@pytest.fixture
def env_manager(conda_fetch, wait_for_task):
    """Fixture to create and cleanup test environments.
    
    Yields a function to create environments. All created environments
    are automatically cleaned up after the test.
    """
    import uuid

    created_envs = []

    async def create_env(name=None, packages=None, remove_if_exists=True):
        """Create a test environment.
        
        Args:
            name: Environment name (auto-generated if not provided)
            packages: List of packages to install
            remove_if_exists: If True, remove existing env with same name
            
        Returns:
            The environment name
        """
        env_name = name or "_" + uuid.uuid4().hex
        
        # Check if env exists and remove if requested
        if remove_if_exists:
            try:
                envs_response = await conda_fetch(NS, "environments", method="GET")
                envs_data = json.loads(envs_response.body)
                existing_names = [e["name"] for e in envs_data.get("environments", [])]
                if env_name in existing_names:
                    # Delete existing environment
                    del_response = await conda_fetch(
                        NS, "environments", env_name, method="DELETE"
                    )
                    if del_response.code == 202:
                        location = del_response.headers.get("Location")
                        await wait_for_task(location)
            except Exception:
                pass  # Ignore errors checking existing envs
        
        created_envs.append(env_name)
        
        body = {"name": env_name, "packages": packages or ["python!=3.14.0"]}
        response = await conda_fetch(
            NS, "environments", method="POST", body=json.dumps(body)
        )
        
        if response.code == 202:
            location = response.headers.get("Location")
            await wait_for_task(location)
        
        return env_name

    yield create_env

    # Cleanup: remove all created environments
    async def cleanup():
        import asyncio
        for env_name in created_envs:
            try:
                response = await conda_fetch(
                    NS, "environments", env_name, method="DELETE"
                )
                if response.code == 202:
                    location = response.headers.get("Location")
                    await wait_for_task(location)
            except Exception:
                pass  # Ignore cleanup errors

    # Run cleanup synchronously using the event loop
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're in an async context, schedule cleanup
            asyncio.ensure_future(cleanup())
        else:
            loop.run_until_complete(cleanup())
    except RuntimeError:
        # No event loop, create one for cleanup
        asyncio.run(cleanup())


# Disable Windows file association dialogs during testing
if sys.platform == "win32":
    os.environ["PATHEXT"] = ""


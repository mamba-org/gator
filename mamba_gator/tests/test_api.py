"""API tests for mamba_gator.

This module contains tests for all REST API endpoints.
Uses pytest-jupyter fixtures for server testing.
"""

import json
import os
import random
import shutil
import sys
import tempfile
import uuid
import unittest.mock as mock
from itertools import chain
from unittest.mock import AsyncMock

import pytest
import tornado.httpclient

from mamba_gator.envmanager import EnvManager

from .utils import assert_http_error, has_mamba

# nb_conda_kernels is only available via conda, so make it optional
try:
    from nb_conda_kernels import CondaKernelSpecManager
    HAS_NB_CONDA_KERNELS = True
except ImportError:
    HAS_NB_CONDA_KERNELS = False
    CondaKernelSpecManager = None


def generate_name() -> str:
    """Generate a random name."""
    return "_" + uuid.uuid4().hex


# =============================================================================
# Helper functions
# =============================================================================


async def get_envs(conda_fetch):
    """Get list of environments."""
    response = await conda_fetch("environments", method="GET")
    return json.loads(response.body)


async def create_env(conda_fetch, wait_for_task, name, packages=None):
    """Create an environment and wait for completion."""
    body = {"name": name, "packages": packages or ["python!=3.14.0"]}
    response = await conda_fetch("environments", method="POST", body=json.dumps(body))
    assert response.code == 202
    location = response.headers.get("Location")
    assert location is not None
    return await wait_for_task(location)


async def delete_env(conda_fetch, wait_for_task, name):
    """Delete an environment and wait for completion."""
    response = await conda_fetch("environments", name, method="DELETE")
    if response.code == 202:
        location = response.headers.get("Location")
        return await wait_for_task(location)
    return response


async def clone_env(conda_fetch, wait_for_task, original_name, new_name):
    """Clone an environment and wait for completion."""
    body = {"name": new_name, "twin": original_name}
    response = await conda_fetch("environments", method="POST", body=json.dumps(body))
    assert response.code == 202
    location = response.headers.get("Location")
    return await wait_for_task(location)


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
async def env_fixture(conda_fetch, wait_for_task):
    """Create a test environment and clean it up after the test."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    yield env_name
    
    # Cleanup
    try:
        await delete_env(conda_fetch, wait_for_task, env_name)
    except Exception:
        pass


@pytest.fixture
async def env_with_python_fixture(conda_fetch, wait_for_task):
    """Create a test environment with Python 3.9."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name, packages=["python=3.9"])
    
    yield env_name
    
    try:
        await delete_env(conda_fetch, wait_for_task, env_name)
    except Exception:
        pass


# =============================================================================
# TestChannelsHandler
# =============================================================================


async def test_get_list_channels(conda_fetch):
    """Test GET /channels returns channel list."""
    response = await conda_fetch("channels", method="GET")
    assert response.code == 200
    data = json.loads(response.body)
    assert "channels" in data
    assert isinstance(data["channels"], dict)


async def test_channels_fail_get(conda_fetch):
    """Test GET /channels with mocked failure."""
    with mock.patch("mamba_gator.envmanager.EnvManager._execute", new_callable=AsyncMock) as f:
        error_msg = "Fail to get channels"
        r = {"error": True, "message": error_msg}
        f.return_value = (1, json.dumps(r))
        
        with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
            await conda_fetch("channels", method="GET")
        
        assert_http_error(exc_info, 500, error_msg)


async def test_channels_deployment(conda_fetch):
    """Test channels with deployment configuration."""
    with mock.patch("mamba_gator.envmanager.EnvManager._execute", new_callable=AsyncMock) as f:
        local_channel = (
            "C:/Users/Public/conda-channel"
            if sys.platform == "win32"
            else "/usr/local/share/conda-channel"
        )
        strip_channel = local_channel.strip("/")
        data = {
            "channel_alias": {
                "auth": None,
                "location": "conda.anaconda.org",
                "name": None,
                "package_filename": None,
                "platform": None,
                "scheme": "https",
                "token": None,
            },
            "channels": ["defaults", "conda-forge", local_channel],
            "custom_channels": {
                strip_channel: {
                    "auth": None,
                    "location": "",
                    "name": strip_channel,
                    "package_filename": None,
                    "platform": None,
                    "scheme": "file",
                    "token": None,
                }
            },
            "custom_multichannels": {
                "defaults": [
                    {
                        "auth": None,
                        "location": "repo.anaconda.com",
                        "name": "pkgs/main",
                        "package_filename": None,
                        "platform": None,
                        "scheme": "https",
                        "token": None,
                    },
                    {
                        "auth": None,
                        "location": "repo.anaconda.com",
                        "name": "pkgs/r",
                        "package_filename": None,
                        "platform": None,
                        "scheme": "https",
                        "token": None,
                    },
                ],
                "local": [
                    {
                        "auth": None,
                        "location": "",
                        "name": strip_channel,
                        "package_filename": None,
                        "platform": None,
                        "scheme": "file",
                        "token": None,
                    }
                ],
            },
        }
        f.return_value = (0, json.dumps(data))

        response = await conda_fetch("channels", method="GET")
        assert response.code == 200

        body = json.loads(response.body)
        channels = body["channels"]
        local = "file:///" if sys.platform == "win32" else "file://"
        expected = {
            strip_channel: [local + local_channel],
            "defaults": [
                "https://repo.anaconda.com/pkgs/main",
                "https://repo.anaconda.com/pkgs/r",
            ],
            "conda-forge": ["https://conda.anaconda.org/conda-forge"],
        }
        assert channels == expected


# =============================================================================
# TestEnvironmentsHandler
# =============================================================================


async def test_environments_get(conda_fetch, wait_for_task):
    """Test GET /environments returns environment list including created one."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        envs = await get_envs(conda_fetch)
        env = None
        for e in envs["environments"]:
            if env_name == e["name"]:
                env = e
                break
        
        assert env is not None
        assert env["name"] == env_name
        assert os.path.isdir(env["dir"])
        assert not env["is_default"]
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_environments_failed_get(conda_fetch):
    """Test GET /environments with mocked failure."""
    with mock.patch("mamba_gator.envmanager.EnvManager._execute", new_callable=AsyncMock) as f:
        msg = "Fail to get environments"
        err = {"error": True, "message": msg}
        f.return_value = (1, json.dumps(err))
        
        with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
            await conda_fetch("environments", method="GET")
        
        assert_http_error(exc_info, 500, msg)


async def test_environments_root(conda_fetch, wait_for_task):
    """Test that base environment exists."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        envs = await get_envs(conda_fetch)
        root = list(filter(lambda env: env["name"] == "base", envs["environments"]))
        assert len(root) == 1
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_env_create_and_destroy(conda_fetch, wait_for_task):
    """Test environment creation and deletion."""
    env_name = generate_name()
    
    # Create environment
    response = await create_env(conda_fetch, wait_for_task, env_name)
    assert response.code == 200
    
    envs = await get_envs(conda_fetch)
    env_names = [env["name"] for env in envs["environments"]]
    assert env_name in env_names
    
    # Delete environment
    response = await delete_env(conda_fetch, wait_for_task, env_name)
    assert response.code == 200
    
    envs = await get_envs(conda_fetch)
    env_names = [env["name"] for env in envs["environments"]]
    assert env_name not in env_names
    
    # Create again
    response = await create_env(conda_fetch, wait_for_task, env_name)
    assert response.code == 200
    
    envs = await get_envs(conda_fetch)
    env_names = [env["name"] for env in envs["environments"]]
    assert env_name in env_names
    
    # Delete again
    response = await delete_env(conda_fetch, wait_for_task, env_name)
    assert response.code == 200
    
    envs = await get_envs(conda_fetch)
    env_names = [env["name"] for env in envs["environments"]]
    assert env_name not in env_names


async def test_empty_environment(conda_fetch, wait_for_task):
    """Test creating an empty environment (no packages specified)."""
    env_name = generate_name()
    
    try:
        body = {"name": env_name}
        response = await conda_fetch("environments", method="POST", body=json.dumps(body))
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
        
        envs = await get_envs(conda_fetch)
        env_names = [env["name"] for env in envs["environments"]]
        assert env_name in env_names
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_env_clone(conda_fetch, wait_for_task):
    """Test environment cloning."""
    env_name = generate_name()
    clone_name = env_name + "-copy"
    
    try:
        await create_env(conda_fetch, wait_for_task, env_name)
        
        response = await clone_env(conda_fetch, wait_for_task, env_name, clone_name)
        assert response.code == 200
        
        envs = await get_envs(conda_fetch)
        env_names = [env["name"] for env in envs["environments"]]
        assert clone_name in env_names
    finally:
        try:
            await delete_env(conda_fetch, wait_for_task, clone_name)
        except Exception:
            pass
        try:
            await delete_env(conda_fetch, wait_for_task, env_name)
        except Exception:
            pass


@pytest.mark.skipif(has_mamba, reason="FIXME not working with mamba")
async def test_environment_yaml_import(conda_fetch, wait_for_task):
    """Test importing environment from YAML file."""
    env_name = generate_name()
    content = """name: test_conda
channels:
- conda-forge
- defaults
dependencies:
- python=3.9
- astroid
prefix: /home/user/.conda/envs/lab_conda
        """
    expected_packages = ["python", "astroid"]

    try:
        body = {"name": env_name, "file": content, "filename": "testenv.yml"}
        response = await conda_fetch("environments", method="POST", body=json.dumps(body))
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200

        envs = await get_envs(conda_fetch)
        env_names = [env["name"] for env in envs["environments"]]
        assert env_name in env_names

        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body).get("packages", [])
        package_names = [p["name"] for p in pkgs]
        for p in expected_packages:
            assert p in package_names, f"{p} not found."
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_environment_text_import(conda_fetch, wait_for_task):
    """Test importing environment from text file."""
    env_name = generate_name()
    content = """# This file may be used to create an environment using:
# $ conda create --name <env> --file <this file>
python=3.9
astroid
        """
    expected_packages = ["python", "astroid"]

    try:
        body = {"name": env_name, "file": content}
        response = await conda_fetch("environments", method="POST", body=json.dumps(body))
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200

        envs = await get_envs(conda_fetch)
        env_names = [env["name"] for env in envs["environments"]]
        assert env_name in env_names
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


@pytest.mark.skipif(has_mamba, reason="FIXME not working with mamba")
async def test_update_env_yaml(conda_fetch, wait_for_task):
    """Test updating environment from YAML file."""
    env_name = generate_name()
    
    try:
        await create_env(conda_fetch, wait_for_task, env_name, ["python=3.9"])

        content = """name: test_conda
channels:
- conda-forge
- defaults
dependencies:
- astroid
prefix: /home/user/.conda/envs/lab_conda
        """
        expected_packages = ["astroid"]

        body = {"file": content, "filename": "testenv.yml"}
        response = await conda_fetch(
            "environments", env_name, method="PATCH", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200

        envs = await get_envs(conda_fetch)
        env_names = [env["name"] for env in envs["environments"]]
        assert env_name in env_names

        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body).get("packages", [])
        package_names = [p["name"] for p in pkgs]
        for p in expected_packages:
            assert p in package_names, f"{p} not found."
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


@pytest.mark.skipif(has_mamba, reason="FIXME not working with mamba")
async def test_update_env_no_filename(conda_fetch, wait_for_task):
    """Test updating environment without specifying filename."""
    env_name = generate_name()
    
    try:
        await create_env(conda_fetch, wait_for_task, env_name, ["python=3.9"])

        content = """name: test_conda
channels:
- conda-forge
- defaults
dependencies:
- astroid
prefix: /home/user/.conda/envs/lab_conda
        """
        expected_packages = ["astroid"]

        body = {"file": content}
        response = await conda_fetch(
            "environments", env_name, method="PATCH", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200

        envs = await get_envs(conda_fetch)
        env_names = [env["name"] for env in envs["environments"]]
        assert env_name in env_names

        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body).get("packages", [])
        package_names = [p["name"] for p in pkgs]
        for p in expected_packages:
            assert p in package_names, f"{p} not found."
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_update_env_txt(conda_fetch, wait_for_task):
    """Test updating environment from text file."""
    env_name = generate_name()
    
    try:
        await create_env(conda_fetch, wait_for_task, env_name, ["python=3.9"])

        content = """# This file may be used to create an environment using:
# $ conda create --name <env> --file <this file>
astroid
        """

        body = {"file": content, "filename": "testenv.txt"}
        response = await conda_fetch(
            "environments", env_name, method="PATCH", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200

        envs = await get_envs(conda_fetch)
        env_names = [env["name"] for env in envs["environments"]]
        assert env_name in env_names

        r = await conda_fetch("environments", env_name, method="GET")
        assert r.code == 200
        body = json.loads(r.body)
        assert "packages" in body
        assert len(body["packages"]) > 0
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


# =============================================================================
# TestEnvironmentsHandlerWhiteList
# =============================================================================


@pytest.mark.skipif(not HAS_NB_CONDA_KERNELS, reason="nb_conda_kernels not installed")
@mock.patch("nb_conda_kernels.manager.CACHE_TIMEOUT", 0)
async def test_get_whitelist(conda_fetch, wait_for_task, jp_serverapp):
    """Test getting environments with whitelist filter."""
    env_name = "banana"
    
    try:
        await create_env(conda_fetch, wait_for_task, env_name, packages=["ipykernel"])
        
        manager = CondaKernelSpecManager()
        manager.whitelist = set(["conda-env-banana-py"])
        env_manager = jp_serverapp.web_app.settings["env_manager"]
        env_manager._kernel_spec_manager = manager

        response = await conda_fetch("environments", method="GET", params={"whitelist": "1"})
        assert response.code == 200
        
        envs = json.loads(response.body)
        env = None
        for e in envs["environments"]:
            if env_name == e["name"]:
                env = e
                break
        
        assert env is not None
        assert env["name"] == env_name
        assert os.path.isdir(env["dir"])
        assert not env["is_default"]
        found_env = len(envs["environments"])
        assert found_env == 2

        # Create another env that shouldn't appear in whitelist
        other_name = generate_name()
        await create_env(conda_fetch, wait_for_task, other_name)
        
        try:
            response = await conda_fetch("environments", method="GET", params={"whitelist": "1"})
            assert response.code == 200
            envs = json.loads(response.body)
            assert len(envs["environments"]) == found_env
        finally:
            await delete_env(conda_fetch, wait_for_task, other_name)
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


# =============================================================================
# TestEnvironmentHandler
# =============================================================================


async def test_environment_delete(conda_fetch, wait_for_task):
    """Test DELETE /environments/<env>."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    response = await delete_env(conda_fetch, wait_for_task, env_name)
    assert response.code == 200


async def test_environment_delete_not_existing(conda_fetch, wait_for_task):
    """Test deleting non-existing environment doesn't raise error."""
    env_name = generate_name()
    response = await delete_env(conda_fetch, wait_for_task, env_name)
    assert response.code == 200


async def test_environment_get(conda_fetch, wait_for_task):
    """Test GET /environments/<env> returns package list."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        response = await conda_fetch("environments", env_name, method="GET")
        assert response.code == 200
        body = json.loads(response.body)
        assert "packages" in body
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_environment_fail_get(conda_fetch):
    """Test GET /environments/<env> for non-existing env."""
    env_name = generate_name()
    
    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await conda_fetch("environments", env_name, method="GET")
    
    # Non-existing environment should return 500
    assert exc_info.value.code == 500


async def test_environment_get_has_update(conda_fetch, wait_for_task):
    """Test GET /environments/<env>?status=has_update."""
    env_name = generate_name()
    
    try:
        body = {"name": env_name, "packages": ["python=3.9", "astroid"]}
        response = await conda_fetch("environments", method="POST", body=json.dumps(body))
        assert response.code == 202
        location = response.headers.get("Location")
        await wait_for_task(location)

        response = await conda_fetch(
            "environments", env_name, method="GET", params={"status": "has_update"}
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
        
        body = json.loads(response.body)
        # The response should contain an "updates" key, even if empty
        assert "updates" in body
        # If updates are available, check it's a valid list
        if len(body["updates"]) > 0:
            assert isinstance(body["updates"], list)
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_env_export(conda_fetch, wait_for_task):
    """Test GET /environments/<env>?download=1."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        response = await conda_fetch(
            "environments", env_name, method="GET", params={"download": "1", "history": "0"}
        )
        assert response.code == 200

        content = response.body.decode()
        import re
        assert re.search(r"name: " + env_name, content)
        assert re.search(r"channels:", content)
        assert re.search(r"dependencies:", content)
        assert re.search(r"- python=\d\.\d+\.\d+=\w+", content)
        assert re.search(r"prefix:", content)
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_env_export_history(conda_fetch, wait_for_task):
    """Test GET /environments/<env>?download=1&history=1."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name, packages=["python=3.9"])
    
    try:
        response = await conda_fetch(
            "environments", env_name, method="GET", params={"download": "1", "history": "1"}
        )
        assert response.code == 200

        content = " ".join(response.body.decode().splitlines())
        import re
        assert re.search(
            r"^name:\s" + env_name + r"\s+channels:(\s+-\s+[^\s]+)+\s+dependencies:\s+-\s+python=3\.9\s+prefix:",
            content
        )
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_env_export_not_supporting_history(conda_fetch, wait_for_task):
    """Test export with old conda version not supporting history."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        EnvManager._conda_version = (4, 6, 0)
        response = await conda_fetch(
            "environments", env_name, method="GET", params={"download": "1", "history": "1"}
        )
        assert response.code == 200

        content = response.body.decode()
        import re
        assert re.search(r"name: " + env_name, content)
        assert re.search(r"channels:", content)
        assert re.search(r"dependencies:", content)
        assert re.search(r"- python=\d\.\d+\.\d+=\w+", content)
        assert re.search(r"prefix:", content)
    finally:
        EnvManager._conda_version = None
        await delete_env(conda_fetch, wait_for_task, env_name)


# =============================================================================
# TestCondaVersion
# =============================================================================


async def test_conda_version(conda_fetch):
    """Test that conda version is set after API call."""
    EnvManager._conda_version = None
    assert EnvManager._conda_version is None
    
    await conda_fetch("environments", method="GET")
    
    assert EnvManager._conda_version is not None


# =============================================================================
# TestPackagesEnvironmentHandler
# =============================================================================


async def test_pkg_install_and_remove(conda_fetch, wait_for_task):
    """Test POST and DELETE /environments/<env>/packages."""
    env_name = generate_name()
    pkg_name = "astroid"
    
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        # Install package
        body = {"packages": [pkg_name]}
        response = await conda_fetch(
            "environments", env_name, "packages", method="POST", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
        
        # Verify installed
        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body)["packages"]
        v = None
        for p in pkgs:
            if p["name"] == pkg_name:
                v = p
                break
        assert v is not None
        
        # Remove package
        body = {"packages": [pkg_name]}
        response = await conda_fetch(
            "environments", env_name, "packages", method="DELETE", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
        
        # Verify removed
        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body)["packages"]
        v = None
        for p in pkgs:
            if p["name"] == pkg_name:
                v = p
                break
        assert v is None
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_pkg_install_with_version_constraints(conda_fetch, wait_for_task):
    """Test installing packages with version constraints."""
    test_pkg = "astroid"
    
    # Test exact version
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name, packages=["python=3.9"])
    
    try:
        body = {"packages": [test_pkg + "==2.14.2"]}
        response = await conda_fetch(
            "environments", env_name, "packages", method="POST", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
        
        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body)["packages"]
        v = None
        for p in pkgs:
            if p["name"] == test_pkg:
                v = p
                break
        assert v["version"] == "2.14.2"
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)

    # Test >= version
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name, packages=["python=3.9"])
    
    try:
        body = {"packages": [test_pkg + ">=2.14.0"]}
        response = await conda_fetch(
            "environments", env_name, "packages", method="POST", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
        
        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body)["packages"]
        v = None
        for p in pkgs:
            if p["name"] == test_pkg:
                v = tuple(map(int, p["version"].split(".")))
                break
        assert v >= (2, 14, 0)
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)

    # Test range version
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name, packages=["python=3.9"])
    
    try:
        body = {"packages": [test_pkg + ">=2.14.0,<3.0.0"]}
        response = await conda_fetch(
            "environments", env_name, "packages", method="POST", body=json.dumps(body)
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
        
        r = await conda_fetch("environments", env_name, method="GET")
        pkgs = json.loads(r.body)["packages"]
        v = None
        for p in pkgs:
            if p["name"] == test_pkg:
                v = tuple(map(int, p["version"].split(".")))
                break
        assert v >= (2, 14, 0)
        assert v < (3, 0, 0)
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_package_install_development_mode(conda_fetch, wait_for_task):
    """Test installing package in development mode."""
    env_name = generate_name()
    pkg_name = "banana"
    
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        with tempfile.TemporaryDirectory() as temp_folder:
            os.mkdir(os.path.join(temp_folder, pkg_name))
            with open(os.path.join(temp_folder, pkg_name, "__init__.py"), "w+") as f:
                f.write("")
            with open(os.path.join(temp_folder, "setup.py"), "w+") as f:
                f.write("from setuptools import setup\n")
                f.write(f"setup(name='{pkg_name}')\n")

            body = {"packages": [temp_folder]}
            response = await conda_fetch(
                "environments", env_name, "packages",
                params={"develop": "1"},
                method="POST", body=json.dumps(body)
            )
            assert response.code == 202
            location = response.headers.get("Location")
            await wait_for_task(location)

            r = await conda_fetch("environments", env_name, method="GET")
            body = json.loads(r.body)

            v = None
            for p in body["packages"]:
                if p["name"] == pkg_name:
                    v = p
                    break
            assert v["channel"] == "<develop>"
            assert v["platform"] == "pypi"
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_package_install_development_mode_url_path(conda_fetch, wait_for_task, jp_root_dir):
    """Test installing package in development mode using URL path."""
    env_name = generate_name()
    pkg_name = generate_name()[1:]  # Remove leading underscore
    folder = os.path.join(str(jp_root_dir), pkg_name)
    
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        os.mkdir(folder)
        os.mkdir(os.path.join(folder, pkg_name))
        with open(os.path.join(folder, pkg_name, "__init__.py"), "w+") as f:
            f.write("")
        with open(os.path.join(folder, "setup.py"), "w+") as f:
            f.write("from setuptools import setup\n")
            f.write(f"setup(name='{pkg_name}')\n")

        body = {"packages": [pkg_name]}
        response = await conda_fetch(
            "environments", env_name, "packages",
            method="POST", body=json.dumps(body), params={"develop": "1"}
        )
        assert response.code == 202
        location = response.headers.get("Location")
        await wait_for_task(location)

        r = await conda_fetch("environments", env_name, method="GET")
        body = json.loads(r.body)

        v = None
        for p in body["packages"]:
            if p["name"] == pkg_name:
                v = p
                break
        assert v["channel"] == "<develop>"
        assert v["platform"] == "pypi"
    finally:
        # Clean up the package directory
        if os.path.exists(folder):
            shutil.rmtree(folder)
        await delete_env(conda_fetch, wait_for_task, env_name)


async def test_pkg_update(conda_fetch, wait_for_task):
    """Test PATCH /environments/<env>/packages."""
    env_name = generate_name()
    await create_env(conda_fetch, wait_for_task, env_name)
    
    try:
        response = await conda_fetch(
            "environments", env_name, "packages", method="PATCH", body="{}"
        )
        assert response.code == 202
        location = response.headers.get("Location")
        response = await wait_for_task(location)
        assert response.code == 200
    finally:
        await delete_env(conda_fetch, wait_for_task, env_name)


# =============================================================================
# TestPackagesHandler
# =============================================================================


async def test_package_search(conda_fetch, wait_for_task):
    """Test GET /packages?query=<pkg>."""
    pkg_name = "astroid"
    
    response = await conda_fetch("packages", method="GET", params={"query": pkg_name})
    assert response.code == 202
    location = response.headers.get("Location")
    response = await wait_for_task(location)
    assert response.code == 200
    
    body = json.loads(response.body)
    assert "packages" in body
    v = None
    for p in body["packages"]:
        if p["name"] == pkg_name:
            v = p
            break
    assert v is not None


async def test_package_list_available(conda_fetch, wait_for_task):
    """Test GET /packages (list all available)."""
    with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", generate_name()):
        with mock.patch("mamba_gator.envmanager.EnvManager._execute", new_callable=AsyncMock) as f:
            dummy = {
                "numpy_sugar": [
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "380115a180acf251faaf754ff37cab8f",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                        "size": 46560,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "version": "1.0.6",
                    },
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "6306fdf5d1f3fad5049f282b63e95403",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                        "size": 46738,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "version": "1.0.8",
                    },
                ],
                "numpydoc": [
                    {
                        "arch": None,
                        "build": "py36_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                        "constrains": [],
                        "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                        "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "f96891e9071727dfca3ea480408396f6",
                        "name": "numpydoc",
                        "platform": None,
                        "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                        "size": 43791,
                        "subdir": "win-64",
                        "timestamp": 1522687759543,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_1",
                        "build_number": 1,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                        "size": 21577,
                        "subdir": "noarch",
                        "timestamp": 1531243883293,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "081b5590105257246eada8a8bc5dd0aa",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                        "size": 32151,
                        "subdir": "noarch",
                        "timestamp": 1555950366084,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                        "version": "0.9.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "de8a98b573872ba539fe7e68e106178a",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                        "size": 29774,
                        "subdir": "noarch",
                        "timestamp": 1556022967544,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                        "version": "0.9.1",
                    },
                ],
            }
            channels = {
                "channel_alias": {
                    "auth": None,
                    "location": "conda.anaconda.org",
                    "name": None,
                    "package_filename": None,
                    "platform": None,
                    "scheme": "https",
                    "token": None,
                },
                "channels": ["defaults"],
                "custom_multichannels": {
                    "defaults": [
                        {
                            "auth": None,
                            "location": "repo.anaconda.com",
                            "name": "pkgs/main",
                            "package_filename": None,
                            "platform": None,
                            "scheme": "https",
                            "token": None,
                        }
                    ]
                },
                "ssl_verify": False,
            }

            if has_mamba:
                dummy = {"result": {"pkgs": list(chain(*dummy.values()))}}

            f.side_effect = [
                (0, json.dumps(dummy)),
                (0, json.dumps(channels)),
            ]

            response = await conda_fetch("packages", method="GET")
            assert response.code == 202
            location = response.headers.get("Location")
            response = await wait_for_task(location)
            assert response.code == 200

            args, _ = f.call_args_list[0]
            if has_mamba:
                assert args[1:] == ("repoquery", "search", "*", "--json")
            else:
                assert args[1:] == ("search", "--json")

            body = json.loads(response.body)

            expected = {
                "packages": [
                    {
                        "build_number": [0, 0],
                        "build_string": ["py35_vc14_0", "py35_vc14_0"],
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "name": "numpy_sugar",
                        "platform": None,
                        "version": ["1.0.8", "1.0.6"],
                        "summary": "",
                        "home": "",
                        "keywords": [],
                        "tags": [],
                    },
                    {
                        "build_number": [0, 0, 1],
                        "build_string": ["py_0", "py_0", "py_1"],
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                        "name": "numpydoc",
                        "platform": None,
                        "version": ["0.9.1", "0.9.0", "0.8.0"],
                        "summary": "Sphinx extension to support docstrings in Numpy format",
                        "home": "https://github.com/numpy/numpydoc",
                        "keywords": [],
                        "tags": [],
                    },
                ],
                "with_description": True,
            }
            assert body == expected


@pytest.mark.skipif(sys.platform.startswith("win"), reason="TODO test not enough reliability")
async def test_package_list_available_local_channel(conda_fetch, wait_for_task):
    """Test GET /packages with local channel."""
    with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", generate_name()):
        with mock.patch("mamba_gator.envmanager.EnvManager._execute", new_callable=AsyncMock) as f:
            dummy = {
                "numpy_sugar": [
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "380115a180acf251faaf754ff37cab8f",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                        "size": 46560,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "version": "1.0.6",
                    },
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "6306fdf5d1f3fad5049f282b63e95403",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                        "size": 46738,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "version": "1.0.8",
                    },
                ],
                "numpydoc": [
                    {
                        "arch": None,
                        "build": "py36_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                        "constrains": [],
                        "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                        "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "f96891e9071727dfca3ea480408396f6",
                        "name": "numpydoc",
                        "platform": None,
                        "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                        "size": 43791,
                        "subdir": "win-64",
                        "timestamp": 1522687759543,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_1",
                        "build_number": 1,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                        "size": 21577,
                        "subdir": "noarch",
                        "timestamp": 1531243883293,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "081b5590105257246eada8a8bc5dd0aa",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                        "size": 32151,
                        "subdir": "noarch",
                        "timestamp": 1555950366084,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                        "version": "0.9.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "de8a98b573872ba539fe7e68e106178a",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                        "size": 29774,
                        "subdir": "noarch",
                        "timestamp": 1556022967544,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                        "version": "0.9.1",
                    },
                ],
            }

            if has_mamba:
                dummy = {"result": {"pkgs": list(chain(*dummy.values()))}}

            with tempfile.TemporaryDirectory() as local_channel:
                with open(os.path.join(local_channel, "channeldata.json"), "w+") as d:
                    d.write(
                        '{ "channeldata_version": 1, "packages": { "numpydoc": { "activate.d": false, "binary_prefix": false, "deactivate.d": false, "description": "Numpy\'s documentation uses several custom extensions to Sphinx. These are shipped in this numpydoc package, in case you want to make use of them in third-party projects.", "dev_url": "https://github.com/numpy/numpydoc", "doc_source_url": "https://github.com/numpy/numpydoc/blob/master/README.rst", "doc_url": "https://pypi.python.org/pypi/numpydoc", "home": "https://github.com/numpy/numpydoc", "icon_hash": null, "icon_url": null, "identifiers": null, "keywords": null, "license": "BSD 3-Clause", "post_link": false, "pre_link": false, "pre_unlink": false, "recipe_origin": null, "run_exports": {}, "source_git_url": null, "source_url": "https://pypi.io/packages/source/n/numpydoc/numpydoc-0.9.1.tar.gz", "subdirs": [ "linux-32", "linux-64", "linux-ppc64le", "noarch", "osx-64", "win-32", "win-64" ], "summary": "Sphinx extension to support docstrings in Numpy format", "tags": null, "text_prefix": false, "timestamp": 1556032044, "version": "0.9.1" } }, "subdirs": [ "noarch" ] }'
                    )
                local_name = local_channel.strip("/")
                channels = {
                    "channel_alias": {
                        "auth": None,
                        "location": "conda.anaconda.org",
                        "name": "",
                        "package_filename": None,
                        "platform": None,
                        "scheme": "https",
                        "token": None,
                    },
                    "channels": ["defaults"],
                    "custom_channels": {},
                    "custom_multichannels": {
                        "defaults": [
                            {
                                "auth": None,
                                "location": "repo.anaconda.com",
                                "name": "pkgs/main",
                                "package_filename": None,
                                "platform": None,
                                "scheme": "https",
                                "token": None,
                            }
                        ]
                    },
                }

                f.side_effect = [
                    (0, json.dumps(dummy)),
                    (0, json.dumps(channels)),
                ]

                response = await conda_fetch("packages", method="GET")
                assert response.code == 202
                location = response.headers.get("Location")
                response = await wait_for_task(location)
                assert response.code == 200

                args, _ = f.call_args_list[0]
                if has_mamba:
                    assert args[1:] == ("repoquery", "search", "*", "--json")
                else:
                    assert args[1:] == ("search", "--json")

                body = json.loads(response.body)

                expected = {
                    "packages": [
                        {
                            "build_number": [0, 0],
                            "build_string": ["py35_vc14_0", "py35_vc14_0"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "name": "numpy_sugar",
                            "platform": None,
                            "version": ["1.0.8", "1.0.6"],
                            "summary": "",
                            "home": "",
                            "keywords": [],
                            "tags": [],
                        },
                        {
                            "build_number": [0, 0, 1],
                            "build_string": ["py_0", "py_0", "py_1"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "name": "numpydoc",
                            "platform": None,
                            "version": ["0.9.1", "0.9.0", "0.8.0"],
                            "summary": "Sphinx extension to support docstrings in Numpy format",
                            "home": "https://github.com/numpy/numpydoc",
                            "keywords": [],
                            "tags": [],
                        },
                    ],
                    "with_description": True,
                }
                assert body == expected


@pytest.mark.skipif(sys.platform.startswith("win"), reason="not reliable on Windows")
async def test_package_list_available_no_description(conda_fetch, wait_for_task):
    """Test GET /packages without description."""
    with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", generate_name()):
        with mock.patch("mamba_gator.envmanager.EnvManager._execute", new_callable=AsyncMock) as f:
            dummy = {
                "numpy_sugar": [
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "380115a180acf251faaf754ff37cab8f",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                        "size": 46560,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "version": "1.0.6",
                    },
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "6306fdf5d1f3fad5049f282b63e95403",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                        "size": 46738,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "version": "1.0.8",
                    },
                ],
                "numpydoc": [
                    {
                        "arch": None,
                        "build": "py36_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                        "constrains": [],
                        "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                        "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "f96891e9071727dfca3ea480408396f6",
                        "name": "numpydoc",
                        "platform": None,
                        "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                        "size": 43791,
                        "subdir": "win-64",
                        "timestamp": 1522687759543,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_1",
                        "build_number": 1,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                        "size": 21577,
                        "subdir": "noarch",
                        "timestamp": 1531243883293,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "081b5590105257246eada8a8bc5dd0aa",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                        "size": 32151,
                        "subdir": "noarch",
                        "timestamp": 1555950366084,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                        "version": "0.9.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "de8a98b573872ba539fe7e68e106178a",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                        "size": 29774,
                        "subdir": "noarch",
                        "timestamp": 1556022967544,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                        "version": "0.9.1",
                    },
                ],
            }

            if has_mamba:
                dummy = {"result": {"pkgs": list(chain(*dummy.values()))}}

            with tempfile.TemporaryDirectory() as local_channel:
                local_name = local_channel.strip("/")
                channels = {
                    "channel_alias": {},
                    "channels": [local_channel],
                    "custom_multichannels": {},
                    "custom_channels": {
                        local_name: {
                            "auth": None,
                            "location": "",
                            "name": local_name,
                            "package_filename": None,
                            "platform": None,
                            "scheme": "file",
                            "token": None,
                        }
                    },
                }

                f.side_effect = [
                    (0, json.dumps(dummy)),
                    (0, json.dumps(channels)),
                ]

                response = await conda_fetch("packages", method="GET")
                assert response.code == 202
                location = response.headers.get("Location")
                response = await wait_for_task(location)
                assert response.code == 200

                args, _ = f.call_args_list[0]
                if has_mamba:
                    assert args[1:] == ("repoquery", "search", "*", "--json")
                else:
                    assert args[1:] == ("search", "--json")

                body = json.loads(response.body)

                expected = {
                    "packages": [
                        {
                            "build_number": [0, 0],
                            "build_string": ["py35_vc14_0", "py35_vc14_0"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "name": "numpy_sugar",
                            "platform": None,
                            "version": ["1.0.8", "1.0.6"],
                            "summary": "",
                            "home": "",
                            "keywords": [],
                            "tags": [],
                        },
                        {
                            "build_number": [0, 0, 1],
                            "build_string": ["py_0", "py_0", "py_1"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "name": "numpydoc",
                            "platform": None,
                            "version": ["0.9.1", "0.9.0", "0.8.0"],
                            "summary": "",
                            "home": "",
                            "keywords": [],
                            "tags": [],
                        },
                    ],
                    "with_description": False,
                }
                assert body == expected


async def test_package_list_available_caching(conda_fetch, wait_for_task):
    """Test GET /packages uses caching."""
    cache_name = generate_name()
    with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", cache_name):
        with mock.patch("mamba_gator.envmanager.EnvManager._execute", new_callable=AsyncMock) as f:
            dummy = {
                "numpy_sugar": [
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "380115a180acf251faaf754ff37cab8f",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                        "size": 46560,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                        "version": "1.0.6",
                    },
                    {
                        "arch": None,
                        "build": "py35_vc14_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "constrains": [],
                        "depends": ["cffi", "ncephes", "numba", "numpy", "python 3.5*", "scipy", "vc 14.*"],
                        "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "license": "MIT",
                        "license_family": "MIT",
                        "md5": "6306fdf5d1f3fad5049f282b63e95403",
                        "name": "numpy_sugar",
                        "platform": None,
                        "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                        "size": 46738,
                        "subdir": "win-64",
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                        "version": "1.0.8",
                    },
                ],
                "numpydoc": [
                    {
                        "arch": None,
                        "build": "py36_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                        "constrains": [],
                        "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                        "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "f96891e9071727dfca3ea480408396f6",
                        "name": "numpydoc",
                        "platform": None,
                        "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                        "size": 43791,
                        "subdir": "win-64",
                        "timestamp": 1522687759543,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_1",
                        "build_number": 1,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                        "size": 21577,
                        "subdir": "noarch",
                        "timestamp": 1531243883293,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                        "version": "0.8.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "081b5590105257246eada8a8bc5dd0aa",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                        "size": 32151,
                        "subdir": "noarch",
                        "timestamp": 1555950366084,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                        "version": "0.9.0",
                    },
                    {
                        "arch": None,
                        "build": "py_0",
                        "build_number": 0,
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                        "constrains": [],
                        "depends": ["python", "sphinx"],
                        "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                        "license": "BSD 3-Clause",
                        "md5": "de8a98b573872ba539fe7e68e106178a",
                        "name": "numpydoc",
                        "noarch": "python",
                        "package_type": "noarch_python",
                        "platform": None,
                        "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                        "size": 29774,
                        "subdir": "noarch",
                        "timestamp": 1556022967544,
                        "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                        "version": "0.9.1",
                    },
                ],
            }
            channels = {
                "channel_alias": {
                    "auth": None,
                    "location": "conda.anaconda.org",
                    "name": None,
                    "package_filename": None,
                    "platform": None,
                    "scheme": "https",
                    "token": None,
                },
                "channels": ["defaults"],
                "custom_multichannels": {
                    "defaults": [
                        {
                            "auth": None,
                            "location": "repo.anaconda.com",
                            "name": "pkgs/main",
                            "package_filename": None,
                            "platform": None,
                            "scheme": "https",
                            "token": None,
                        }
                    ]
                },
                "ssl_verify": False,
            }

            if has_mamba:
                dummy = {"result": {"pkgs": list(chain(*dummy.values()))}}

            f.side_effect = [
                (0, json.dumps(dummy)),
                (0, json.dumps(channels)),
            ]

            # First retrieval - no cache available
            response = await conda_fetch("packages", method="GET")
            assert response.code == 202
            location = response.headers.get("Location")
            response = await wait_for_task(location)
            assert response.code == 200

            args, _ = f.call_args_list[0]
            if has_mamba:
                assert args[1:] == ("repoquery", "search", "*", "--json")
            else:
                assert args[1:] == ("search", "--json")

            expected = {
                "packages": [
                    {
                        "build_number": [0, 0],
                        "build_string": ["py35_vc14_0", "py35_vc14_0"],
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                        "name": "numpy_sugar",
                        "platform": None,
                        "version": ["1.0.8", "1.0.6"],
                        "summary": "",
                        "home": "",
                        "keywords": [],
                        "tags": [],
                    },
                    {
                        "build_number": [0, 0, 1],
                        "build_string": ["py_0", "py_0", "py_1"],
                        "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                        "name": "numpydoc",
                        "platform": None,
                        "version": ["0.9.1", "0.9.0", "0.8.0"],
                        "summary": "Sphinx extension to support docstrings in Numpy format",
                        "home": "https://github.com/numpy/numpydoc",
                        "keywords": [],
                        "tags": [],
                    },
                ],
                "with_description": True,
            }

            cache_file = os.path.join(tempfile.gettempdir(), cache_name + ".json")
            assert os.path.exists(cache_file)

            with open(cache_file) as cache:
                assert json.load(cache) == expected

            # Retrieve using cache
            response = await conda_fetch("packages", method="GET")
            assert response.code == 200
            body = json.loads(response.body)
            assert body == expected


# =============================================================================
# TestTasksHandler
# =============================================================================


async def test_get_invalid_task(conda_fetch):
    """Test GET /tasks/<id> with invalid task ID."""
    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await conda_fetch("tasks", str(random.randint(1, 1200)), method="GET")
    
    assert exc_info.value.code == 404


async def test_delete_invalid_task(conda_fetch):
    """Test DELETE /tasks/<id> with invalid task ID."""
    with pytest.raises(tornado.httpclient.HTTPClientError) as exc_info:
        await conda_fetch("tasks", str(random.randint(1, 1200)), method="DELETE")
    
    assert exc_info.value.code == 404


async def test_delete_task(conda_fetch, wait_for_task):
    """Test DELETE /tasks/<id> cancels a task."""
    env_name = generate_name()
    
    try:
        body = {"name": env_name, "packages": ["python!=3.14.0"]}
        response = await conda_fetch("environments", method="POST", body=json.dumps(body))
        location = response.headers.get("Location")
        _, index = location.rsplit("/", maxsplit=1)
        
        response = await conda_fetch("tasks", index, method="DELETE")
        assert response.code == 204
    finally:
        # Try to clean up the environment if it was created
        try:
            await delete_env(conda_fetch, wait_for_task, env_name)
        except Exception:
            pass

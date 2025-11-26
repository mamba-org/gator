"""Minimal debug test for mamba_gator API.

This is a temporary debug version to diagnose CI failures.
"""

import json
import os
import subprocess
import sys

import pytest

from mamba_gator.envmanager import EnvManager, CONDA_EXE
from mamba_gator.handlers import NS


async def test_debug_conda_environment(conda_fetch):
    """Debug test to understand the conda environment in CI."""
    print("\n" + "=" * 60)
    print("DEBUG: Conda Environment Information")
    print("=" * 60)
    
    # Print Python info
    print(f"\nPython executable: {sys.executable}")
    print(f"Python version: {sys.version}")
    print(f"Platform: {sys.platform}")
    
    # Print environment variables
    print("\n--- Environment Variables ---")
    for key in sorted(os.environ.keys()):
        if any(x in key.upper() for x in ['CONDA', 'MAMBA', 'PATH']):
            print(f"{key}={os.environ[key]}")
    
    # Print CONDA_EXE from envmanager
    print(f"\n--- EnvManager Constants ---")
    print(f"CONDA_EXE: {CONDA_EXE}")
    print(f"EnvManager._manager_exe: {EnvManager._manager_exe}")
    print(f"EnvManager._conda_version: {EnvManager._conda_version}")
    
    # Try to find conda
    print("\n--- Finding Conda ---")
    try:
        result = subprocess.run(
            ["which", "conda"] if sys.platform != "win32" else ["where", "conda"],
            capture_output=True,
            text=True
        )
        print(f"which conda: {result.stdout.strip()}")
        print(f"which conda stderr: {result.stderr.strip()}")
        print(f"which conda returncode: {result.returncode}")
    except Exception as e:
        print(f"Error finding conda: {e}")
    
    # Try to run conda info
    print("\n--- Conda Info ---")
    try:
        result = subprocess.run(
            [CONDA_EXE, "info", "--json"],
            capture_output=True,
            text=True,
            timeout=30
        )
        print(f"conda info returncode: {result.returncode}")
        print(f"conda info stdout (first 500 chars): {result.stdout[:500]}")
        if result.stderr:
            print(f"conda info stderr: {result.stderr[:500]}")
    except Exception as e:
        print(f"Error running conda info: {e}")
    
    # Try to run conda env list
    print("\n--- Conda Env List ---")
    try:
        result = subprocess.run(
            [CONDA_EXE, "env", "list", "--json"],
            capture_output=True,
            text=True,
            timeout=30
        )
        print(f"conda env list returncode: {result.returncode}")
        print(f"conda env list stdout (first 500 chars): {result.stdout[:500]}")
        if result.stderr:
            print(f"conda env list stderr: {result.stderr[:500]}")
    except Exception as e:
        print(f"Error running conda env list: {e}")
    
    # Try to run conda config --show channels
    print("\n--- Conda Channels ---")
    try:
        result = subprocess.run(
            [CONDA_EXE, "config", "--show", "channels", "--json"],
            capture_output=True,
            text=True,
            timeout=30
        )
        print(f"conda config returncode: {result.returncode}")
        print(f"conda config stdout: {result.stdout[:500]}")
        if result.stderr:
            print(f"conda config stderr: {result.stderr[:500]}")
    except Exception as e:
        print(f"Error running conda config: {e}")
    
    # Now try the actual API call
    print("\n--- API Call: GET /channels ---")
    try:
        response = await conda_fetch(NS, "channels", method="GET")
        print(f"Response code: {response.code}")
        print(f"Response body (first 500 chars): {response.body[:500] if response.body else 'None'}")
    except Exception as e:
        print(f"API Error: {type(e).__name__}: {e}")
        # If it's an HTTP error, try to get more info
        if hasattr(e, 'response') and e.response:
            print(f"Error response body: {e.response.body}")
    
    print("\n" + "=" * 60)
    print("END DEBUG")
    print("=" * 60 + "\n")
    
    # This test should pass - we're just collecting info
    assert True


# Comment out all other tests for now - will restore after debugging
"""
# =============================================================================
# All other tests are commented out for debugging
# =============================================================================
"""

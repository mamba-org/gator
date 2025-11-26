"""Test utilities for mamba_gator tests.

This module provides helper functions and constants for testing.
"""

import json
import os
import sys
from subprocess import CalledProcessError, check_call

import tornado.httpclient

from mamba_gator.handlers import NS

TIMEOUT = 150
SLEEP = 1

# Detect if mamba is available
try:
    check_call(["mamba", "--version"])
except (CalledProcessError, FileNotFoundError):
    has_mamba = False
else:
    has_mamba = True


def assert_http_error(error, expected_code, expected_message=None):
    """Check that the error matches the expected output error.
    
    Args:
        error: The pytest.raises context manager result
        expected_code: Expected HTTP status code
        expected_message: Optional substring to look for in error message
    """
    e = error.value
    if isinstance(e, tornado.httpclient.HTTPClientError):
        assert expected_code == e.code, f"Expected status code {expected_code} != {e.code}"
        if expected_message:
            message = json.loads(e.response.body.decode())["message"]
            assert expected_message in message, f"Expected '{expected_message}' not in '{message}'"


# Disable Windows file association dialogs during testing
if sys.platform == "win32":
    os.environ["PATHEXT"] = ""

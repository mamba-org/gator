"""Helpers for tests"""
import json
from contextlib import contextmanager

try:
    from unittest.mock import AsyncMock  # New in Python 3.8 and used by unittest.mock
except ImportError:
    AsyncMock = None

import tornado
from jupyter_server.utils import ensure_async


@contextmanager
def assert_http_error(expected_code, expected_message=None):
    """Check that the error matches the expected output error."""
    try:
        yield
    except tornado.web.HTTPError as e:
        assert (
            expected_code == e.status_code
        ), f"Expected status code {expected_code} != {e.status_code}"
        if expected_message is not None:
            assert expected_message in str(
                e
            ), f"Expected error message '{expected_message}' not in '{str(e)}'"
    except (tornado.httpclient.HTTPClientError, tornado.httpclient.HTTPError) as e:
        assert (
            expected_code == e.code
        ), f"Expected status code {expected_code} != {e.code}"
        if expected_message:
            message = json.loads(e.response.body.decode())["message"]
            assert (
                expected_message in message
            ), f"Expected error message '{expected_message}' not in '{message}'"


def maybe_future(args):
    if AsyncMock is None:
        return ensure_async(args)
    else:
        return args

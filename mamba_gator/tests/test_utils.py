import os
import pytest
import requests
from contextlib import contextmanager
from mamba_gator.envmanager import RUNNER_COMMAND, get_env_path


@pytest.mark.parametrize(
    "spec,expected",
    [
        (
            {
                "argv": [
                    *RUNNER_COMMAND,
                    "/path/to/conda",
                    os.path.join("path", "to", "envs", "myenv"),
                    "-m",
                    "ipykernel_launcher",
                ],
                "metadata": {},
            },
            os.path.join("path", "to", "envs", "myenv"),
        ),
        (
            {
                "argv": [
                    *RUNNER_COMMAND,
                    "/path/to/conda",
                    os.path.join("path", "to", "envs", "myenv"),
                    "-m",
                    "ipykernel_launcher",
                ],
                "metadata": {
                    "conda_env_path": os.path.join("path", "to", "envs", "myenv")
                },
            },
            os.path.join("path", "to", "envs", "myenv"),
        ),
        (
            {
                "argv": [os.path.join("path", "to", "envs", "myenv", "bin", "python")],
                "metadata": {},
            },
            os.path.join("path", "to", "envs", "myenv"),
        ),
        ({"argv": [], "metadata": {}}, None),
    ],
)
def test_get_env_path(spec, expected):
    assert get_env_path(spec) == expected

@contextmanager
def assert_http_error(expected_status, msg=None):
    """Assert that a block of code raises a requests.HTTPError with the expected status code.

    Usage:
        with assert_http_error(404):
            requests.get("/nonexistent")
    """
    try:
        yield
    except requests.HTTPError as e:
        actual = e.response.status_code
        assert actual == expected_status, f"Expected {expected_status}, got {actual}"
        if msg:
            assert msg in str(e), f"Expected message '{msg}' in error, got '{e}'"
    else:
        raise AssertionError(f"Expected HTTP error {expected_status}, but none was raised.")
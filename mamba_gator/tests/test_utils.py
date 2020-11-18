import os
import pytest

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

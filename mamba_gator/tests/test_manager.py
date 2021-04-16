from pathlib import Path
from subprocess import CalledProcessError, check_call

import pytest
from mamba_gator.envmanager import EnvManager

try:
    check_call(["mamba", "--version"])
except CalledProcessError:
    has_mamba = False
else:
    has_mamba = True


@pytest.mark.skipif(has_mamba, reason="Mamba found")
def test_EnvManager_manager_conda():
    manager = EnvManager("", None)

    assert Path(manager.manager).stem == "conda"


@pytest.mark.skipif(not has_mamba, reason="Mamba NOT found")
def test_EnvManager_manager_mamba():
    manager = EnvManager("", None)

    assert Path(manager.manager).stem == "mamba"

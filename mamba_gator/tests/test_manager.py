from pathlib import Path

import pytest
from mamba_gator.envmanager import EnvManager

try:
    import mamba
except ImportError:
    mamba = None


@pytest.mark.skipif(mamba is not None, reason="Mamba found")
def test_EnvManager_manager_conda():
    manager = EnvManager("", None)

    assert Path(manager.manager).stem == "conda"


@pytest.mark.skipif(mamba is None, reason="Mamba NOT found")
def test_EnvManager_manager_mamba():
    manager = EnvManager("", None)

    assert Path(manager.manager).stem == "mamba"

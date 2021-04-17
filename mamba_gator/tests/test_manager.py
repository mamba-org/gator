from pathlib import Path

import pytest
from mamba_gator.envmanager import EnvManager

from .utils import has_mamba


@pytest.mark.skipif(has_mamba, reason="Mamba found")
def test_EnvManager_manager_conda():
    manager = EnvManager("", None)

    assert Path(manager.manager).stem == "conda"


@pytest.mark.skipif(not has_mamba, reason="Mamba NOT found")
def test_EnvManager_manager_mamba():
    manager = EnvManager("", None)

    assert Path(manager.manager).stem == "mamba"

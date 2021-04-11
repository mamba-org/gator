from pathlib import Path
from mamba_gator.envmanager import EnvManager


def test_EnvManager_manager():
    try:
        import mamba
    except ImportError:
        expected = "conda"
    else:
        expected = "mamba"

    manager = EnvManager("", None)

    assert Path(manager.manager).stem == expected

import json
import os.path as osp

# flake8: noqa
from ._version import version_info, __version__
from .handlers import _load_jupyter_server_extension
from .navigator.main import MambaNavigator


# Jupyter Extension points
def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "@mamba-org/gator-lab"}]


def _jupyter_server_extension_points():
    return [{"module": "mamba_gator"}, {"module": "mamba_gator.navigator.main", "app": MambaNavigator}]


# For backward compatibility
load_jupyter_server_extension = _load_jupyter_server_extension

import json
import os.path as osp

# flake8: noqa
try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings

    warnings.warn("Importing 'mamba_gator' outside a proper installation.")
    __version__ = "dev"

from .handlers import _load_jupyter_server_extension
from .navigator.main import MambaNavigator


# Jupyter Extension points
def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "@mamba-org/gator-lab"}]


def _jupyter_server_extension_points():
    return [{"module": "mamba_gator"}, {"module": "mamba_gator.navigator.main", "app": MambaNavigator}]


# For backward compatibility
load_jupyter_server_extension = _load_jupyter_server_extension

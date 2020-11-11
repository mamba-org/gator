# flake8: noqa
from ._version import version_info, __version__
from .handlers import load_jupyter_server_extension

# Jupyter Extension points
def _jupyter_nbextension_paths():
    return [
        dict(
            section="notebook", src="nbextension", dest="mamba_gator", require="mamba_gator/main"
        ),
        dict(section="tree", src="nbextension", dest="mamba_gator", require="mamba_gator/tree"),
    ]


def _jupyter_server_extension_paths():
    return [dict(module="mamba_gator")]

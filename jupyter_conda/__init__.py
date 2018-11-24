# flake8: noqa
from ._version import version_info, __version__
from .handlers import load_jupyter_server_extension

# Jupyter Extension points
def _jupyter_nbextension_paths():
    return [
        dict(
            section="notebook", src="static", dest="jupyter_conda", require="jupyter_conda/main"
        ),
        dict(section="tree", src="static", dest="jupyter_conda", require="jupyter_conda/tree"),
    ]


def _jupyter_server_extension_paths():
    return [dict(module="jupyter_conda")]

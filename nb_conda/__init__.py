from ._version import version_info, __version__


def _jupyter_nbextension_paths():
    return [dict(section="notebook",
                 src="nbextension/static",
                 dest="nb_conda",
                 require="nb_conda/main")]


def _jupyter_server_extension_paths():
    return [dict(module='nb_conda.nbextension')]

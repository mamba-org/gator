# Shim for notebook server or jupyter_server

try:
    from notebook.base.handlers import APIHandler
    from notebook.utils import url_escape, url_path_join
except ImportError:
    from jupyter_server.base.handlers import APIHandler  # noqa
    from jupyter_server.utils import url_escape, url_path_join  # noqa

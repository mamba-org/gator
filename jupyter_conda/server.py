# Shim for notebook server or jupyter_server

try:
    from notebook.base.handlers import APIHandler
    from notebook.utils import url_escape, url_path_join, url2path
except ImportError:
    from jupyter_server.base.handlers import APIHandler  # noqa
    from jupyter_server.utils import url_escape, url_path_join, url2path  # noqa

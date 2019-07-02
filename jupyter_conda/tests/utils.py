# Shim for notebook server or jupyter_server
#
# Provides:
#  - ServerTestBase
#  - assert_http_error
#  - url_escape
#  - url_path_join
#

try:
    from notebook.tests.launchnotebook import (
        assert_http_error,
        NotebookTestBase as ServerTestBase,
    )
    from notebook.utils import url_escape, url_path_join
except ImportError:
    from jupyter_server.tests.launchnotebook import assert_http_error  # noqa
    from jupyter_server.tests.launchserver import ServerTestBase  # noqa
    from jupyter_server.utils import url_escape, url_path_join  # noqa


class APITester(object):
    """Wrapper for REST API requests"""

    url = "/"

    def __init__(self, request):
        self.request = request

    def _req(self, verb, path, body=None, params=None):
        response = self.request(
            verb, url_path_join(self.url, *path), data=body, params=params
        )

        if 400 <= response.status_code < 600:
            try:
                response.reason = response.json()["message"]
            except Exception:
                pass
        response.raise_for_status()

        return response

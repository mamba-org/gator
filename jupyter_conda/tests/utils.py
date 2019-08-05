import datetime
import time
from typing import List

from traitlets.config import Config

# Shim for notebook server or jupyter_server
#
# Provides:
#  - ServerTestBase
#  - assert_http_error
#  - url_escape
#  - url_path_join

try:
    from notebook.tests.launchnotebook import (
        assert_http_error,
        NotebookTestBase as ServerTestBase,
    )
    from notebook.utils import url_escape, url_path_join, url2path
except ImportError:
    from jupyter_server.tests.launchnotebook import assert_http_error  # noqa
    from jupyter_server.tests.launchserver import ServerTestBase  # noqa
    from jupyter_server.utils import url_escape, url_path_join, url2path  # noqa


TIMEOUT = 60
SLEEP = 1


class APITester(object):
    """Wrapper for REST API requests"""

    url = "/"

    def __init__(self, request):
        self.request = request

    def _req(self, verb: str, path: List[str], body=None, params=None):
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


class JupyterCondaAPI(APITester):
    """Wrapper for nbconvert API calls."""

    url = "conda"

    def get(self, path: List[str], body=None, params=None):
        return self._req("GET", path, body, params)

    def post(self, path: List[str], body=None, params=None):
        return self._req("POST", path, body, params)

    def envs(self):
        return self.get(["environments"]).json()


class ServerTest(ServerTestBase):

    # Force extension enabling - Disabled by parent class otherwise
    config = Config({"NotebookApp": {"nbserver_extensions": {"jupyter_conda": True}}})

    def setUp(self):
        super(ServerTest, self).setUp()
        self.conda_api = JupyterCondaAPI(self.request)

    def wait_task(self, endpoint: str):
        start_time = datetime.datetime.now()

        while (datetime.datetime.now() - start_time).total_seconds() < TIMEOUT:
            time.sleep(SLEEP)
            response = self.conda_api.get([endpoint, ])
            response.raise_for_status()
            if response.status_code != 202:
                return response
            
        raise RuntimeError("Request {} timed out.".format(endpoint))

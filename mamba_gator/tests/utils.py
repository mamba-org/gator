import datetime
import errno
import json
import os
import sys
import time
from binascii import hexlify
from subprocess import CalledProcessError, check_call
from threading import Event, Thread
from typing import List
from unittest import TestCase
from unittest.mock import patch

import jupyter_core.paths
from ipython_genutils.tempdir import TemporaryDirectory
from mamba_gator.handlers import NS
from tornado.ioloop import IOLoop
from traitlets.config import Config

# Shim for notebook server or jupyter_server
#
# Provides:
#  - ServerTestBase
#  - assert_http_error
#  - url_escape
#  - url_path_join

try:
    from notebook.notebookapp import NotebookApp as ServerApp
    from notebook.tests.launchnotebook import NotebookTestBase as ServerTestBase
    from notebook.tests.launchnotebook import assert_http_error
    from notebook.utils import url_escape, url_path_join
except ImportError:
    from jupyter_server.serverapp import ServerApp  # noqa
    from jupyter_server.tests.launchnotebook import assert_http_error  # noqa
    from jupyter_server.tests.launchserver import ServerTestBase  # noqa
    from jupyter_server.utils import url_escape, url_path_join  # noqa


TIMEOUT = 150
SLEEP = 1

try:
    check_call(["mamba", "--version"])
except (CalledProcessError, FileNotFoundError):
    has_mamba = False
else:
    has_mamba = True


class APITester(object):
    """Wrapper for REST API requests"""

    url = "/"

    def __init__(self, request):
        self.request = request

    def _req(self, verb: str, path: List[str], body=None, params=None):
        if body is not None:
            body = json.dumps(body)
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

    url = NS

    def delete(self, path: List[str], body=None, params=None):
        return self._req("DELETE", path, body, params)

    def get(self, path: List[str], body=None, params=None):
        return self._req("GET", path, body, params)

    def patch(self, path: List[str], body=None, params=None):
        return self._req("PATCH", path, body, params)

    def post(self, path: List[str], body=None, params=None):
        return self._req("POST", path, body, params)

    def envs(self):
        return self.get(["environments"]).json()


class ServerTest(ServerTestBase):

    # Force extension enabling - Disabled by parent class otherwise
    config = Config({"NotebookApp": {"nbserver_extensions": {"mamba_gator": True}}})

    @classmethod
    def setup_class(cls):
        # Copy paste from https://github.com/jupyter/notebook/blob/6.0.0/notebook/tests/launchnotebook.py
        #  Only to suppress setting PYTHONPATH with sys.path
        #   For notebook v6 we could overwrite get_env_patch but unfortunately it is not available for Python 3.5
        cls.tmp_dir = TemporaryDirectory()

        def tmp(*parts):
            path = os.path.join(cls.tmp_dir.name, *parts)
            try:
                os.makedirs(path)
            except OSError as e:
                if e.errno != errno.EEXIST:
                    raise
            return path

        cls.home_dir = tmp("home")
        data_dir = cls.data_dir = tmp("data")
        config_dir = cls.config_dir = tmp("config")
        runtime_dir = cls.runtime_dir = tmp("runtime")
        cls.notebook_dir = tmp("notebooks")
        cls.env_patch = patch.dict(
            "os.environ",
            {
                "HOME": cls.home_dir,
                "IPYTHONDIR": os.path.join(cls.home_dir, ".ipython"),
                "JUPYTER_NO_CONFIG": "1",  # needed in the future
                "JUPYTER_CONFIG_DIR": cls.config_dir,
                "JUPYTER_DATA_DIR": cls.data_dir,
                "JUPYTER_RUNTIME_DIR": cls.runtime_dir,
            },
        )
        cls.env_patch.start()
        cls.path_patch = patch.multiple(
            jupyter_core.paths,
            SYSTEM_JUPYTER_PATH=[tmp("share", "jupyter")],
            ENV_JUPYTER_PATH=[tmp("env", "share", "jupyter")],
            SYSTEM_CONFIG_PATH=[tmp("etc", "jupyter")],
            ENV_CONFIG_PATH=[tmp("env", "etc", "jupyter")],
        )
        cls.path_patch.start()

        config = cls.config or Config()
        config.NotebookNotary.db_file = ":memory:"

        cls.token = hexlify(os.urandom(4)).decode("ascii")

        started = Event()

        def start_thread():
            if "asyncio" in sys.modules:
                import asyncio

                asyncio.set_event_loop(asyncio.new_event_loop())
            app = cls.notebook = ServerApp(
                port=cls.port,
                port_retries=0,
                open_browser=False,
                config_dir=cls.config_dir,
                data_dir=cls.data_dir,
                runtime_dir=cls.runtime_dir,
                notebook_dir=cls.notebook_dir,
                base_url=cls.url_prefix,
                config=config,
                allow_root=True,
                token=cls.token,
            )
            # don't register signal handler during tests
            app.init_signal = lambda: None
            # clear log handlers and propagate to root for nose to capture it
            # needs to be redone after initialize, which reconfigures logging
            app.log.propagate = True
            app.log.handlers = []
            app.initialize()
            app.log.propagate = True
            app.log.handlers = []
            loop = IOLoop.current()
            loop.add_callback(started.set)
            try:
                app.start()
            finally:
                # set the event, so failure to start doesn't cause a hang
                started.set()
                app.session_manager.close()

        cls.notebook_thread = Thread(target=start_thread)
        cls.notebook_thread.daemon = True
        cls.notebook_thread.start()
        started.wait()
        cls.wait_until_alive()

    def setUp(self):
        super(ServerTest, self).setUp()
        self.conda_api = JupyterCondaAPI(self.request)

    def wait_task(self, endpoint: str):
        start_time = datetime.datetime.now()
        if endpoint.startswith("/" + NS):
            endpoint = endpoint[len(NS) + 1 :]

        while (datetime.datetime.now() - start_time).total_seconds() < TIMEOUT:
            time.sleep(SLEEP)
            response = self.conda_api.get([endpoint])
            response.raise_for_status()
            if response.status_code != 202:
                return response

        raise RuntimeError("Request {} timed out.".format(endpoint))

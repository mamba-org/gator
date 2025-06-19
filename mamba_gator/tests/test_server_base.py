import os
import time
import requests
import asyncio
import tempfile
import traceback
from threading import Thread, Event
from unittest import TestCase
from binascii import hexlify
from jupyter_server.serverapp import ServerApp
from jupyter_server.utils import url_path_join
from traitlets.config import Config

POLL_INTERVAL = 0.5
MAX_WAITTIME = 30

class ServerTestBase(TestCase):
    port = 12341
    config = None
    url_prefix = "/a%40b/"
    token = None

    @classmethod
    def base_url(cls):
        return f"http://localhost:{cls.port}{cls.url_prefix}"

    @classmethod
    def auth_headers(cls):
        return {"Authorization": f"token {cls.token}"} if cls.token else {}

    @classmethod
    def request(cls, verb, path, **kwargs):
        headers = kwargs.setdefault("headers", {})
        headers.update(cls.auth_headers())
        return requests.request(verb, url_path_join(cls.base_url(), path), **kwargs)

    @classmethod
    def setup_class(cls):
        cls.tmp_dir = tempfile.TemporaryDirectory()
        cls.home_dir = os.path.join(cls.tmp_dir.name, "home")
        cls.config_dir = os.path.join(cls.tmp_dir.name, "config")
        cls.data_dir = os.path.join(cls.tmp_dir.name, "data")
        cls.runtime_dir = os.path.join(cls.tmp_dir.name, "runtime")
        cls.notebook_dir = os.path.join(cls.tmp_dir.name, "notebooks")

        for d in [cls.home_dir, cls.config_dir, cls.data_dir, cls.runtime_dir, cls.notebook_dir]:
            os.makedirs(d, exist_ok=True)

        cls.token = hexlify(os.urandom(4)).decode("ascii")
        started = Event()

        def start_thread():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            app_config = cls.config or Config()
            app_config.NotebookNotary.db_file = ":memory:"
            cls.server_app = ServerApp(
                port=cls.port,
                port_retries=0,
                open_browser=False,
                config_dir=cls.config_dir,
                data_dir=cls.data_dir,
                runtime_dir=cls.runtime_dir,
                notebook_dir=cls.notebook_dir,
                base_url=cls.url_prefix,
                allow_root=True,
                token=cls.token,
                config=app_config,
            )
            cls.server_app.init_signal = lambda: None
            cls.server_app.initialize()
            loop.add_callback(started.set)
            try:
                cls.server_app.start()
            except Exception as e:
                print("ServerApp failed to start:", e)
                traceback.print_exc()
            finally:
                started.set()

        cls.server_thread = Thread(target=start_thread, daemon=True)
        cls.server_thread.start()
        started.wait()
        cls.wait_until_alive()

    @classmethod
    def teardown_class(cls):
        cls.server_app.stop()
        cls.server_thread.join(timeout=10)
        cls.tmp_dir.cleanup()

    @classmethod
    def wait_until_alive(cls):
        url = url_path_join(cls.base_url(), "api", "contents")
        for _ in range(int(MAX_WAITTIME / POLL_INTERVAL)):
            try:
                r = requests.get(url, headers=cls.auth_headers())
                if r.status_code == 200:
                    return
            except Exception:
                if not cls.server_thread.is_alive():
                    raise RuntimeError("Server thread died during startup")
            time.sleep(POLL_INTERVAL)
        raise TimeoutError("The Jupyter server didn't start up correctly.")

    @classmethod
    def wait_until_dead(cls):
        cls.server_thread.join(timeout=MAX_WAITTIME)
        if cls.server_thread.is_alive():
            raise TimeoutError("Jupyter server failed to shut down")

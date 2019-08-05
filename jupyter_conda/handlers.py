"""
# Copyright (c) 2015-2016 Continuum Analytics.
# Copyright (c) 2016-2019 Jupyter Development Team.
# See LICENSE.txt for the license.
"""
# pylint: disable=W0221

import collections
import json
import logging
import re
from typing import Any, Callable

import tornado

from .server import APIHandler, url_path_join
from .envmanager import EnvManager

# logger = logging.getLogger(__name__)
# logger.parent = logging.getLevelName("tornado")

NS = r"conda"


class ActionsStack:
    """Process queue of asynchronous task one at a time."""

    __last_index = 0  # type: int
    __queue = collections.deque()  # type: collections.deque
    __results = {}  # type: Dict[int, Any]

    def __init__(self):
        tornado.ioloop.IOLoop.current().spawn_callback(ActionsStack.__worker)
    
    def put(self, task: Callable, *args) -> int:
        """Add a asynchronous task into the queue.
        
        Args:
            task (Callable): Asynchronous task
            *args : arguments of the task

        Returns:
            int: Task id
        """
        ActionsStack.__last_index += 1
        idx = ActionsStack.__last_index
        ActionsStack.__queue.append((idx, task, args))
        ActionsStack.__results[idx] = None  # Task is pending
        return idx

    def get(self, idx: int) -> Any:
        """Get the task `idx` results or None.
        
        Args:
            idx (int): Task index
        
        Returns:
            Any: None if the task is pending else its result

        Raises:
            ValueError: If the task `idx` does not exists
        """
        if idx not in ActionsStack.__results:
            raise ValueError("Task {} does not exists.".format(idx))
        r = ActionsStack.__results[idx] 
        if r is not None:  # Remove the result
            ActionsStack.__results.pop(idx)
        return r

    @staticmethod
    @tornado.gen.coroutine
    def __worker():
        while True:
            try:
                t = ActionsStack.__queue.popleft()
                if t is None:
                    return

                idx, task, args = t
                try:
                    # logger.debug("Will execute task {}.".format(idx))
                    result = yield task(*args)
                except Exception as e:
                    result = {"error": str(e)}
                finally:
                    # logger.debug("Has executed task {}.".format(idx))
                    ActionsStack.__results[idx] = result
            except IndexError:
                yield tornado.gen.moment  # Queue is empty

    def __del__(self):
        # Stop the worker
        ActionsStack.__queue.append(None)


class EnvBaseHandler(APIHandler):
    """
    Mixin for an env manager. Just maintains a reference to the
    'env_manager' which implements all of the conda functions.
    """

    _stack = None  # type: ActionsStack

    def initialize(self):
        EnvBaseHandler._stack = ActionsStack()        

    @property
    def env_manager(self) -> EnvManager:
        """Return our env_manager instance"""
        return self.settings["env_manager"]


class MainEnvHandler(EnvBaseHandler):
    """
    Handler for `GET /environments` which lists the environments.
    """

    @tornado.web.authenticated
    @tornado.gen.coroutine
    def get(self):
        list_envs = yield self.env_manager.list_envs()
        if "error" in list_envs:
            self.set_status(500)
        self.finish(json.dumps(list_envs))


class EnvHandler(EnvBaseHandler):
    """
    Handler for `GET /environments/<name>` which lists
    the packages in the specified environment.
    """

    @tornado.web.authenticated
    @tornado.gen.coroutine
    def get(self, env: str):
        packages = yield self.env_manager.env_packages(env)
        if "error" in packages:
            self.set_status(500)
        self.finish(json.dumps(packages))


class ChannelsHandler(EnvBaseHandler):
    """
    Handler for `GET /environments/<name>/channels` which lists
    the channels in the specified environment.
    """

    @tornado.web.authenticated
    @tornado.gen.coroutine
    def get(self, env: str):
        channels = yield self.env_manager.env_channels(env)
        if "error" in channels:
            self.set_status(500)
        self.finish(json.dumps(channels))


class EnvActionHandler(EnvBaseHandler):
    """
    Handler for `GET /environments/<name>/export` which
    exports the specified environment, and
    `POST /environments/<name>/{delete,clone,create}`
    which performs the requested action on the environment.
    """

    @tornado.web.authenticated
    @tornado.gen.coroutine
    def get(self, env: str, action: str):
        if action != "export":
            self.set_status(404)
            self.finish(
                json.dumps(
                    {
                        "error": "Unknown action '{}' with GET /environments/<name>; available action 'export'.".format(
                            action
                        )
                    }
                )
            )
            return

        # export requirements file
        self.set_header(
            "Content-Disposition", 'attachment; filename="%s"' % (env + ".yml")
        )
        export_env = yield self.env_manager.export_env(env)
        if "error" in export_env:
            self.set_status(500)
        self.finish(export_env)

    @tornado.web.authenticated
    def post(self, env: str, action: str):

        content_type = self.request.headers.get("Content-Type", None)
        if content_type == "application/json":
            data = self.get_json_body() or {}
            name = data.get("name", None)
            env_type = data.get("type", None)
            file_content = data.get("file", None)
            file_name = data.get("filename", None)
        else:
            name = self.get_argument("name", default=None)
            env_type = self.get_argument("type", default=None)
            file_content = self.get_argument("file", default=None)
            file_name = self.get_argument("filename", default=None)

        if action == "delete":
            idx = self._stack.put(self.env_manager.delete_env, env)
        elif action == "clone":
            if not name:
                name = "{}-copy".format(env)
            idx = self._stack.put(self.env_manager.clone_env, env, name)
        elif action == "create":
            idx = self._stack.put(self.env_manager.create_env, env, env_type)
        elif action == "import":
            if file_name:
                idx = self._stack.put(self.env_manager.import_env, env, file_content, file_name)
            else:
                idx = self._stack.put(self.env_manager.import_env, env, file_content)

        self.set_status(202)
        self.set_header("Location", "/tasks/{}".format(idx))


class EnvPkgActionHandler(EnvBaseHandler):
    """
    Handler for
    `POST /environments/<name>/packages/{install,develop,update,check,remove}`
    which performs the requested action on the packages in the specified
    environment.
    """

    @tornado.web.authenticated
    @tornado.gen.coroutine
    def post(self, env: str, action: str):
        self.log.debug("req body: %s", self.request.body)
        content_type = self.request.headers.get("Content-Type", None)
        if content_type == "application/json":
            packages = self.get_json_body()["packages"]
        else:
            packages = self.get_arguments("packages[]")

        if action != "develop":
            # don't allow arbitrary switches
            packages = [pkg for pkg in packages if re.match(_pkg_regex, pkg)]
            if not packages:
                if action in ["install", "remove"]:
                    self.set_status(404)
                    self.finish(
                        json.dumps(
                            {
                                "error": "Install or remove require packages to be specified."
                            }
                        )
                    )
                    return
                else:
                    packages = ["--all"]
        if action not in ("install", "develop", "update", "check", "remove"):
            self.set_status(404)
            self.finish(
                json.dumps({"error": "Unknown action {} on packages.".format(action)})
            )
            return

        if action == "install":
            idx = self._stack.put(self.env_manager.install_packages, env, packages)
        elif action == "develop":
            idx = self._stack.put(self.env_manager.develop_packages, env, packages)
        elif action == "update":
            idx = self._stack.put(self.env_manager.update_packages, env, packages)
        elif action == "check":
            idx = self._stack.put(self.env_manager.check_update, env, packages)
        elif action == "remove":
            idx = self._stack.put(self.env_manager.remove_packages, env, packages)

        self.set_status(202)
        self.set_header("Location", "/tasks/{}".format(idx))


class AvailablePackagesHandler(EnvBaseHandler):
    """
    Handler for `GET /packages/<name>/available`, which uses CondaSearcher
    to list the packages available for installation.

    This returns only the 100 packages. You can get the next one by using
    the query argument `$skip=N`.
    If there are more than 100 packages, the return payload will have a key
    `$next` informing more packages are available.
    """

    @tornado.web.authenticated
    @tornado.gen.coroutine
    def get(self, env: str):

        @tornado.gen.coroutine
        def f():
            data = yield self.env_manager.list_available()
            if "error" in data:
                return data
            else:
                {"packages": data}

        idx = self._stack.put(f)

        self.set_status(202)
        self.set_header("Location", "/tasks/{}".format(idx))


class SearchHandler(EnvBaseHandler):
    """
    Handler for `GET /packages/<name>/search?q=<query>`, which uses CondaSearcher
    to search the available conda packages. Note, this is pretty slow
    and the jupyter_conda UI doesn't call it.
    """

    @tornado.web.authenticated
    @tornado.gen.coroutine
    def get(self, env: str):
        q = self.get_argument("q")
        idx = self._stack.put(self.env_manager.package_search, q)

        self.set_status(202)
        self.set_header("Location", "/tasks/{}".format(idx))


class TaskHandler(EnvBaseHandler):

    @tornado.web.authenticated
    def get(self, index: int):
        try:
            r = EnvBaseHandler._stack.get(int(index))
        except ValueError as err:       
            raise tornado.web.HTTPError(404, message=str(err))
        else:
            if r is None:
                self.set_status(202)
            else:
                if "error" in r:
                    self.set_status(500)
                else:
                    self.set_status(200)
                self.finish(tornado.escape.json_encode(r))

# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------


_env_action_regex = r"(?P<action>create|export|import|clone|delete)"  # type: str

# there is almost no text that is invalid, but no hyphens up front, please
# neither all these suspicious but valid caracthers...
_env_regex = r"(?P<env>[^/&+$?@<>%*-][^/&+$?@<>%*]*)"  # type: str

# no hyphens up front, please
_pkg_regex = r"(?P<pkg>[^\-][\-\da-zA-Z\._]+)"  # type: str

_pkg_action_regex = r"(?P<action>install|develop|update|check|remove)"  # type: str

default_handlers = [
    (r"/environments", MainEnvHandler),
    (
        r"/environments/%s/packages/%s" % (_env_regex, _pkg_action_regex),
        EnvPkgActionHandler,
    ),
    (r"/environments/%s/%s" % (_env_regex, _env_action_regex), EnvActionHandler),
    (r"/environments/%s/channels" % _env_regex, ChannelsHandler),
    (r"/environments/%s" % _env_regex, EnvHandler),
    (r"/packages/%s/available" % _env_regex, AvailablePackagesHandler),
    (r"/packages/%s/search" % _env_regex, SearchHandler),
    (r"/tasks/%s"  % r"(?P<index>\d+)", TaskHandler)
]


def load_jupyter_server_extension(nbapp):
    """Load the nbserver extension"""
    webapp = nbapp.web_app
    webapp.settings["env_manager"] = EnvManager(parent=nbapp)

    base_url = webapp.settings["base_url"]
    webapp.add_handlers(
        ".*$",
        [(url_path_join(base_url, NS, pat), handler) for pat, handler in default_handlers],
    )
    nbapp.log.info("[jupyter_conda] enabled")

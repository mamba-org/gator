"""
# Copyright (c) 2015-2016 Continuum Analytics.
# Copyright (c) 2016-2019 Jupyter Development Team.
# See LICENSE.txt for the license.
"""
# pylint: disable=W0221

# Tornado get and post handlers often have different args from their base class
# methods.

import json
import os
import re
import typing as tp

from notebook.utils import url_path_join as ujoin
from notebook.base.handlers import APIHandler
from tornado import gen, web

from .envmanager import EnvManager

NS = r"conda"


class EnvBaseHandler(APIHandler):
    """
    Mixin for an env manager. Just maintains a reference to the
    'env_manager' which implements all of the conda functions.
    """

    @property
    def env_manager(self) -> EnvManager:
        """Return our env_manager instance"""
        return self.settings["env_manager"]


class MainEnvHandler(EnvBaseHandler):
    """
    Handler for `GET /environments` which lists the environments.
    """

    @web.authenticated
    @gen.coroutine
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

    @web.authenticated
    @gen.coroutine
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

    @web.authenticated
    @gen.coroutine
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

    @web.authenticated
    @gen.coroutine
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
            "Content-Disposition", 'attachment; filename="%s"' % (env + ".txt")
        )
        export_env = yield self.env_manager.export_env(env)
        if "error" in export_env:
            self.set_status(500)
        self.finish(export_env)

    @web.authenticated
    @gen.coroutine
    def post(self, env: str, action: str):
        status = None

        content_type = self.request.headers.get("Content-Type", None)
        if content_type == "application/json":
            data = self.get_json_body() or {}
            name = data.get("name", None)
            env_type = data.get("type", None)
            file_content = data.get("file", None)
        else:
            name = self.get_argument("name", default=None)
            env_type = self.get_argument("type", default=None)
            file_content = self.get_argument("file", default=None)

        if action == "delete":
            data = yield self.env_manager.delete_env(env)
        elif action == "clone":
            if not name:
                name = "{}-copy".format(env)
            data = yield self.env_manager.clone_env(env, name)
            status = 201  # CREATED
        elif action == "create":
            data = yield self.env_manager.create_env(env, env_type)
            status = 201  # CREATED
        elif action == "import":
            data = yield self.env_manager.import_env(env, file_content)
            status = 201  # CREATED

        # catch-all ok
        if "error" in data:
            status = 500

        self.set_status(status or 200)
        self.finish(json.dumps(data))


class EnvPkgActionHandler(EnvBaseHandler):
    """
    Handler for
    `POST /environments/<name>/packages/{install,develop,update,check,remove}`
    which performs the requested action on the packages in the specified
    environment.
    """

    @web.authenticated
    @gen.coroutine
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
            self.finish(json.dumps({"error": "Unknown action {} on packages.".format(action)}))
            return

        if action == "install":
            resp = yield self.env_manager.install_packages(env, packages)
        elif action == "develop":
            resp = yield self.env_manager.develop_packages(env, packages)
        elif action == "update":
            resp = yield self.env_manager.update_packages(env, packages)
        elif action == "check":
            resp = yield self.env_manager.check_update(env, packages)
        elif action == "remove":
            resp = yield self.env_manager.remove_packages(env, packages)

        if "error" in resp:
            self.set_status(500)

        self.finish(json.dumps(resp))


class AvailablePackagesHandler(EnvBaseHandler):
    """
    Handler for `GET /packages/<name>/available`, which uses CondaSearcher
    to list the packages available for installation.
    """

    @web.authenticated
    @gen.coroutine
    def get(self, env: str):
        data = yield self.env_manager.list_available(env)

        if "error" in data:
            self.set_status(500)
            self.finish(json.dumps(data))
            return

        self.finish(json.dumps({"packages": data}))


class SearchHandler(EnvBaseHandler):
    """
    Handler for `GET /packages/<name>/search?q=<query>`, which uses CondaSearcher
    to search the available conda packages. Note, this is pretty slow
    and the jupyter_conda UI doesn't call it.
    """

    @web.authenticated
    @gen.coroutine
    def get(self, env: str):
        q = self.get_argument("q")
        answer = yield self.env_manager.package_search(env, q)
        if "error" in answer:
            self.set_status(500)

        self.finish(json.dumps(answer))


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
]


def load_jupyter_server_extension(nbapp):
    """Load the nbserver extension"""
    webapp = nbapp.web_app
    webapp.settings["env_manager"] = EnvManager(parent=nbapp)

    base_url = webapp.settings["base_url"]
    webapp.add_handlers(
        ".*$",
        [(ujoin(base_url, NS, pat), handler) for pat, handler in default_handlers],
    )
    nbapp.log.info("[jupyter_conda] enabled")

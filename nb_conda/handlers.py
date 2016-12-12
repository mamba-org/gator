"""
# Copyright (c) 2015-2016 Continuum Analytics.
# See LICENSE.txt for the license.
"""
# pylint: disable=W0221

# Tornado get and post handlers often have different args from their base class
# methods.

import json
import os
import re

from subprocess import Popen
from tempfile import TemporaryFile

from pkg_resources import parse_version
from notebook.utils import url_path_join as ujoin
from notebook.base.handlers import (
    APIHandler,
    json_errors,
)
from tornado import web

from .envmanager import EnvManager, package_map


static = os.path.join(os.path.dirname(__file__), 'static')

NS = r'conda'


class EnvBaseHandler(APIHandler):
    """
    Mixin for an env manager. Just maintains a reference to the
    'env_manager' which implements all of the conda functions.
    """
    @property
    def env_manager(self):
        """Return our env_manager instance"""
        return self.settings['env_manager']


class MainEnvHandler(EnvBaseHandler):
    """
    Handler for `GET /environments` which lists the environments.
    """
    @web.authenticated
    @json_errors
    def get(self):
        self.finish(json.dumps(self.env_manager.list_envs()))


class EnvHandler(EnvBaseHandler):
    """
    Handler for `GET /environments/<name>` which lists
    the packages in the specified environment.
    """
    @web.authenticated
    @json_errors
    def get(self, env):
        self.finish(json.dumps(self.env_manager.env_packages(env)))


class EnvActionHandler(EnvBaseHandler):
    """
    Handler for `GET /environments/<name>/export` which
    exports the specified environment, and
    `POST /environments/<name>/{delete,clone,create}`
    which performs the requested action on the environment.
    """
    @web.authenticated
    @json_errors
    def get(self, env, action):
        if action == 'export':
            # export requirements file
            self.set_header('Content-Disposition',
                            'attachment; filename="%s"' % (env + '.txt'))
            self.finish(self.env_manager.export_env(env))
        else:
            raise web.HTTPError(400)

    @web.authenticated
    @json_errors
    def post(self, env, action):
        status = None

        if action == 'delete':
            data = self.env_manager.delete_env(env)
        elif action == 'clone':
            name = self.get_argument('name', default=None)
            if not name:
                name = '{}-copy'.format(env)
            data = self.env_manager.clone_env(env, name)
            if 'error' not in data:
                status = 201  # CREATED
        elif action == 'create':
            env_type = self.get_argument('type', default=None)
            if env_type not in package_map:
                raise web.HTTPError(400)
            data = self.env_manager.create_env(env, env_type)
            if 'error' not in data:
                status = 201  # CREATED

        # catch-all ok
        if 'error' in data:
            status = 400

        self.set_status(status or 200)
        self.finish(json.dumps(data))


class EnvPkgActionHandler(EnvBaseHandler):
    """
    Handler for
    `POST /environments/<name>/packages/{install,update,check,remove}`
    which performs the requested action on the packages in the specified
    environment.
    """
    @web.authenticated
    @json_errors
    def post(self, env, action):
        self.log.debug('req body: %s', self.request.body)
        packages = self.get_arguments('packages[]')

        # don't allow arbitrary switches
        packages = [pkg for pkg in packages if re.match(_pkg_regex, pkg)]

        if not packages:
            if action in ["install", "remove"]:
                raise web.HTTPError(400)
            else:
                packages = ["--all"]

        if action == 'install':
            resp = self.env_manager.install_packages(env, packages)
        elif action == 'update':
            resp = self.env_manager.update_packages(env, packages)
        elif action == 'check':
            resp = self.env_manager.check_update(env, packages)
        elif action == 'remove':
            resp = self.env_manager.remove_packages(env, packages)
        else:
            raise web.HTTPError(400)

        self.finish(json.dumps(resp))


class CondaSearcher(object):
    """
    Helper object that runs `conda search` to retrieve the
    list of packages available in the current conda channels.
    """
    def __init__(self):
        self.conda_process = None
        self.conda_temp = None

    def list_available(self, handler=None):
        """
        List the available conda packages by kicking off a background
        conda process. Will return None. Call again to poll the process
        status. When the process completes, a list of packages will be
        returned upon success. On failure, the results of `conda search --json`
        will be returned (this will be a dict containing error information).
        TODO - break up this method.
        """
        self.log = handler.log

        if self.conda_process is not None:
            # already running, check for completion
            self.log.debug('Already running: pid %s', self.conda_process.pid)

            status = self.conda_process.poll()
            self.log.debug('Status %s', status)

            if status is not None:
                # completed, return the data
                self.log.debug('Done, reading output')
                self.conda_process = None

                self.conda_temp.seek(0)
                data = json.loads(self.conda_temp.read())
                self.conda_temp = None

                if 'error' in data:
                    # we didn't get back a list of packages, we got a
                    # dictionary with error info
                    return data

                packages = []

                for entries in data.values():
                    max_version = None
                    max_version_entry = None

                    for entry in entries:
                        version = parse_version(entry.get('version', ''))

                        if max_version is None or version > max_version:
                            max_version = version
                            max_version_entry = entry

                    packages.append(max_version_entry)

                return sorted(packages, key=lambda entry: entry.get('name'))

        else:
            # Spawn subprocess to get the data
            self.log.debug('Starting conda process')
            self.conda_temp = TemporaryFile(mode='w+')
            cmdline = 'conda search --json'.split()
            self.conda_process = Popen(cmdline, stdout=self.conda_temp,
                                       bufsize=4096)
            self.log.debug('Started: pid %s', self.conda_process.pid)

        return None


searcher = CondaSearcher()


class AvailablePackagesHandler(EnvBaseHandler):
    """
    Handler for `GET /packages/available`, which uses CondaSearcher
    to list the packages available for installation.
    """
    @web.authenticated
    @json_errors
    def get(self):
        data = searcher.list_available(self)

        if data is None:
            # tell client to check back later
            self.clear()
            self.set_status(202)  # Accepted
            self.finish('{}')
        else:
            self.finish(json.dumps({"packages": data}))


class SearchHandler(EnvBaseHandler):
    """
    Handler for `GET /packages/search?q=<query>`, which uses CondaSearcher
    to search the available conda packages. Note, this is pretty slow
    and the nb_conda UI doesn't call it.
    """
    @web.authenticated
    @json_errors
    def get(self):
        q = self.get_argument('q')
        self.finish(json.dumps(self.env_manager.package_search(q)))


# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------


_env_action_regex = r"(?P<action>create|export|clone|delete)"

# there is almost no text that is invalid, but no hyphens up front, please
# neither all these suspicious but valid caracthers...
_env_regex = r"(?P<env>[^/&+$?@<>%*-][^/&+$?@<>%*]*)"

# no hyphens up front, please
_pkg_regex = r"(?P<pkg>[^\-][\-\da-zA-Z\._]+)"

_pkg_action_regex = r"(?P<action>install|update|check|remove)"

default_handlers = [
    (r"/environments", MainEnvHandler),
    (r"/environments/%s/packages/%s" % (_env_regex, _pkg_action_regex),
        EnvPkgActionHandler),
    (r"/environments/%s/%s" % (_env_regex, _env_action_regex),
        EnvActionHandler),
    (r"/environments/%s" % _env_regex, EnvHandler),
    (r"/packages/available", AvailablePackagesHandler),
    (r"/packages/search", SearchHandler),
]


def load_jupyter_server_extension(nbapp):
    """Load the nbserver extension"""
    webapp = nbapp.web_app
    webapp.settings['env_manager'] = EnvManager(parent=nbapp)

    base_url = webapp.settings['base_url']
    webapp.add_handlers(".*$", [
        (ujoin(base_url, NS, pat), handler)
        for pat, handler in default_handlers
    ])
    nbapp.log.info("[nb_conda] enabled")

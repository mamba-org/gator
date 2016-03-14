# Copyright (c) IPython Development Team.
# Distributed under the terms of the Modified BSD License.

# Tornado get and post handlers often have different args from their base class methods.
# pylint: disable=W0221

import json
import logging
import os

from subprocess import Popen
from tempfile import TemporaryFile

from pkg_resources import parse_version
from notebook.utils import url_path_join as ujoin
from notebook.base.handlers import IPythonHandler
from tornado import web

from .envmanager import EnvManager, package_map

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)


static = os.path.join(os.path.dirname(__file__), 'static')


class EnvBaseHandler(IPythonHandler):

    @property
    def env_manager(self):
        return self.settings['env_manager']


class MainEnvHandler(EnvBaseHandler):

    @web.authenticated
    def get(self):
        self.finish(json.dumps(self.env_manager.list_envs()))


class EnvHandler(EnvBaseHandler):

    @web.authenticated
    def get(self, env):
        self.finish(json.dumps(self.env_manager.env_packages(env)))


class EnvActionHandler(EnvBaseHandler):

    @web.authenticated
    def get(self, env, action):
        if action == 'export':
            # export environment file
            self.set_header('Content-Disposition', 'attachment; filename="%s"' % (env + '.txt'))
            self.finish(self.env_manager.export_env(env))
        else:
            raise web.HTTPError(400)

    @web.authenticated
    def post(self, env, action):
        if action == 'delete':
            data = self.env_manager.delete_env(env)
        elif action == 'clone':
            name = self.get_argument('name', default=None)
            if not name:
                name = env + '-copy'
            data = self.env_manager.clone_env(env, name)
        elif action == 'update':
            # TODO - some kind of 'check for updates/apply updates' workflow
            raise NotImplementedError
        elif action == 'create':
            env_type = self.get_argument('type', default=None)
            if env_type not in package_map:
                raise web.HTTPError(400)

            data = self.env_manager.create_env(env, env_type)
        self.finish(json.dumps(data))


class EnvPkgActionHandler(EnvBaseHandler):

    @web.authenticated
    def post(self, env, action):
        log.debug('req body: %s', self.request.body)
        packages = self.get_arguments('packages[]')
        if not packages:
            raise web.HTTPError(400)

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
    def __init__(self):
        self.conda_process = None
        self.conda_temp = None

    def list_available(self):
        if self.conda_process is not None:
            # already running, check for completion
            log.debug('Already running: pid %s', self.conda_process.pid)

            status = self.conda_process.poll()
            log.debug('Status %s', status)

            if status is not None:
                # completed, return the data
                log.debug('Done, reading output')
                self.conda_process = None

                self.conda_temp.seek(0)
                data = json.loads(self.conda_temp.read())
                self.conda_temp = None

                if 'error' in data:
                    # we didn't get back a list of packages, we got a dictionary with error info
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
            log.debug('Starting conda process')
            self.conda_temp = TemporaryFile(mode='w+')
            cmdline = 'conda search --json'.split()
            self.conda_process = Popen(cmdline, stdout=self.conda_temp, bufsize=4096)
            log.debug('Started: pid %s', self.conda_process.pid)

        return None

searcher = CondaSearcher()


class AvailablePackagesHandler(EnvBaseHandler):

    @web.authenticated
    def get(self):
        data = searcher.list_available()

        if data is None:
            # tell client to check back later
            self.clear()
            self.set_status(202)  # Accepted
            self.finish('{}')
        else:
            self.finish(json.dumps(data))


class SearchHandler(EnvBaseHandler):

    @web.authenticated
    def get(self):
        q = self.get_argument('q')
        self.finish(json.dumps(self.env_manager.package_search(q)))


# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------


_env_action_regex = r"(?P<action>create|export|clone|delete)"
_env_regex = r"(?P<env>[^\/]+)"  # there is almost no text that is invalid

_pkg_regex = r"(?P<pkg>[^\/]+)"
_pkg_action_regex = r"(?P<action>install|update|check|remove)"

default_handlers = [
    (r"/environments", MainEnvHandler),
    (r"/environments/%s/packages/%s" % (_env_regex, _pkg_action_regex), EnvPkgActionHandler),
    (r"/environments/%s/%s" % (_env_regex, _env_action_regex), EnvActionHandler),
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
        (ujoin(base_url, pat), handler)
        for pat, handler in default_handlers
    ])

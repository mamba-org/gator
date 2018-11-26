# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os
import re
from tempfile import NamedTemporaryFile

from packaging.version import parse
from subprocess import Popen, PIPE

from notebook.utils import url_path_join
from tornado import gen, ioloop, httpclient, httputil, web
from traitlets.config.configurable import LoggingConfigurable


def normalize_pkg_info(s):
    return {
        "build_number": s.get("build_number"),
        "build_string": s.get("build_string", s.get("build")),
        "channel": s.get("channel"),
        "name": s.get("name"),
        "platform": s.get("platform"),
        "version": s.get("version"),
        "summary": s.get("summary", ""),
        "home": s.get("home", ""),
        "keywords": s.get("keywords", []),
        "tags": s.get("tags", []),
    }


MAX_LOG_OUTPUT = 6000

CONDA_EXE = os.environ.get("CONDA_EXE", "conda")

# try to match lines of json
JSONISH_RE = r'(^\s*["\{\}\[\],\d])|(["\}\}\[\],\d]\s*$)'

# these are the types of environments that can be created
package_map = {
    "python2": "python=2 ipykernel",
    "python3": "python=3 ipykernel",
    "r": "r-base r-essentials",
}


class EnvManager(LoggingConfigurable):
    def _call_subprocess(self, cmdline):
        process = Popen(cmdline, stdout=PIPE, stderr=PIPE)
        output, error = process.communicate()
        return (process.returncode, output, error)

    @gen.coroutine
    def _execute(self, cmd, *args):
        cmdline = cmd.split()
        cmdline.extend(args)

        self.log.debug("[jupyter_conda] command: %s", cmdline)

        # process = Popen(cmdline, stdout=PIPE, stderr=PIPE)
        # output, error = process.communicate()
        current_loop = ioloop.IOLoop.current()
        returncode, output, error = yield current_loop.run_in_executor(
            None, self._call_subprocess, cmdline
        )

        if returncode == 0:
            output = output.decode("utf-8")
        else:
            self.log.debug("[jupyter_conda] exit code: %s", returncode)
            output = error.decode("utf-8")

        self.log.debug("[jupyter_conda] output: %s", output[:MAX_LOG_OUTPUT])

        if len(output) > MAX_LOG_OUTPUT:
            self.log.debug("[jupyter_conda] ...")

        return output

    @gen.coroutine
    def list_envs(self):
        """List all environments that conda knows about"""
        output = yield self._execute(CONDA_EXE + " info --json")
        info = self.clean_conda_json(output)
        default_env = info["default_prefix"]

        root_env = {
            "name": "base",
            "dir": info["root_prefix"],
            "is_default": info["root_prefix"] == default_env,
        }

        def get_info(env):
            return {
                "name": os.path.basename(env),
                "dir": env,
                "is_default": env == default_env,
            }

        envs_folder = os.path.join(info["root_prefix"], "envs")

        return {
            "environments": [root_env]
            + [get_info(env) for env in info["envs"] if env.startswith(envs_folder)]
        }

    @gen.coroutine
    def delete_env(self, env):
        output = yield self._execute(CONDA_EXE + " env remove -y -q --json -n " + env)
        return self.clean_conda_json(output)

    def clean_conda_json(self, output):
        lines = output.splitlines()

        try:
            return json.loads("\n".join(lines))
        except (ValueError, json.JSONDecodeError) as err:
            self.log.warn("[jupyter_conda] JSON parse fail:\n%s", err)

        # try to remove bad lines
        lines = [line for line in lines if re.match(JSONISH_RE, line)]

        try:
            return json.loads("\n".join(lines))
        except (ValueError, json.JSONDecodeError) as err:
            self.log.error("[jupyter_conda] JSON clean/parse fail:\n%s", err)

        return {"error": True}

    @gen.coroutine
    def export_env(self, env):
        output = yield self._execute(CONDA_EXE + " list -e -n " + env)
        return output

    @gen.coroutine
    def clone_env(self, env, name):
        output = yield self._execute(
            CONDA_EXE + " create -y -q --json -n " + name + " --clone " + env
        )
        return self.clean_conda_json(output)

    @gen.coroutine
    def create_env(self, env, type):
        packages = package_map.get(type, type)
        output = yield self._execute(
            CONDA_EXE + " create -y -q --json -n " + env, *packages.split()
        )
        return self.clean_conda_json(output)

    @gen.coroutine
    def import_env(self, env, file_content):
        with NamedTemporaryFile(mode="w", delete=False) as f:
            name = f.name
            f.write(file_content)
        output = yield self._execute(
            CONDA_EXE + " create -y -q --json -n " + env + " --file " + name
        )
        os.unlink(name)
        return self.clean_conda_json(output)

    @gen.coroutine
    def env_channels(self, env):
        output = yield self._execute(CONDA_EXE + " config --show --json")
        info = self.clean_conda_json(output)
        if env != "base":
            old_prefix = os.environ["CONDA_PREFIX"]
            envs = yield self.list_envs()
            envs = envs["environments"]
            env_dir = None
            for env_i in envs:
                if env_i["name"] == env:
                    env_dir = env_i["dir"]
                    break

            os.environ["CONDA_PREFIX"] = env_dir
            output = yield self._execute(CONDA_EXE + " config --show --json")
            info = self.clean_conda_json(output)
            os.environ["CONDA_PREFIX"] = old_prefix

        deployed_channels = {}

        def get_uri(spec):
            location = "/".join((spec["location"], spec["name"]))
            if spec["scheme"] == "file" and location[0] != "/":
                location = "/" + location
            return spec["scheme"] + "://" + location

        for channel in info["channels"]:
            if channel in info["custom_multichannels"]:
                deployed_channels[channel] = [
                    get_uri(entry) for entry in info["custom_multichannels"][channel]
                ]
            elif os.path.sep not in channel:
                spec = info["channel_alias"]
                spec["name"] = channel
                deployed_channels[channel] = [get_uri(spec)]
            else:
                deployed_channels[channel] = ["file:///" + channel]

        self.log.debug("[jupyter_conda] {} channels: {}".format(env, deployed_channels))

        if "error" in info:
            return info
        return {"channels": deployed_channels}

    @gen.coroutine
    def env_packages(self, env):
        output = yield self._execute(CONDA_EXE + " list --no-pip --json -n " + env)
        data = self.clean_conda_json(output)

        # Data structure
        #   List of dictionary. Example:
        # {
        #     "base_url": null,
        #     "build_number": 0,
        #     "build_string": "py36_0",
        #     "channel": "defaults",
        #     "dist_name": "anaconda-client-1.6.14-py36_0",
        #     "name": "anaconda-client",
        #     "platform": null,
        #     "version": "1.6.14"
        # }

        if "error" in data:
            # we didn't get back a list of packages, we got a dictionary with
            # error info
            return data

        return {"packages": [normalize_pkg_info(package) for package in data]}

    @gen.coroutine
    def list_available(self, env):
        output = yield self._execute(CONDA_EXE + " search --json -n " + env)

        data = self.clean_conda_json(output)

        if "error" in data:
            # we didn't get back a list of packages, we got a
            # dictionary with error info
            return data

        packages = []

        # Data structure
        #  Dictionary with package name key and value is a list of dictionary. Example:
        #  {
        #   "arch": "x86_64",
        #   "build": "np17py33_0",
        #   "build_number": 0,
        #   "channel": "https://repo.anaconda.com/pkgs/free/win-64",
        #   "constrains": [],
        #   "date": "2013-02-20",
        #   "depends": [
        #     "numpy 1.7*",
        #     "python 3.3*"
        #   ],
        #   "fn": "astropy-0.2-np17py33_0.tar.bz2",
        #   "license": "BSD",
        #   "md5": "3522090a8922faebac78558fbde9b492",
        #   "name": "astropy",
        #   "platform": "win32",
        #   "size": 3352442,
        #   "subdir": "win-64",
        #   "url": "https://repo.anaconda.com/pkgs/free/win-64/astropy-0.2-np17py33_0.tar.bz2",
        #   "version": "0.2"
        # }

        # List all available version for packages
        for entries in data.values():
            pkg_entry = None
            versions = list()
            max_build_numbers = list()
            max_build_strings = list()

            for entry in entries:
                entry = normalize_pkg_info(entry)
                if pkg_entry is None:
                    pkg_entry = entry

                version = parse(entry.get("version", ""))

                if version not in versions:
                    versions.append(version)
                    max_build_numbers.append(entry.get("build_number", 0))
                    max_build_strings.append(entry.get("build_string", ""))
                else:
                    version_idx = versions.index(version)
                    build_number = entry.get("build_number", 0)
                    if build_number > max_build_numbers[version_idx]:
                        max_build_numbers[version_idx] = build_number
                        max_build_strings[version_idx] = entry.get("build_string", "")

            sorted_versions_idx = sorted(range(len(versions)), key=versions.__getitem__)

            pkg_entry["version"] = [str(versions[i]) for i in sorted_versions_idx]
            pkg_entry["build_number"] = [
                max_build_numbers[i] for i in sorted_versions_idx
            ]
            pkg_entry["build_string"] = [
                max_build_strings[i] for i in sorted_versions_idx
            ]

            packages.append(pkg_entry)

        # Get channel short names
        channels = yield self.env_channels(env)
        channels = channels["channels"]
        tr_channels = {}
        for short_name, channel in channels.items():
            tr_channels.update({uri: short_name for uri in channel})

        # # Get top channel URI to request channeldata.json
        # top_channels = set()
        # for uri in tr_channels:
        #     channel, arch = os.path.split(uri)
        #     if arch in PLATFORMS:
        #         top_channels.add(channel)
        #     else:
        #         top_channels.add(uri)

        # Request channeldata.json
        pkg_info = {}
        client = httpclient.AsyncHTTPClient(force_instance=True)
        for channel in tr_channels:
            url = httputil.urlparse(channel)
            if url.scheme == "file":
                path = (
                    "".join(("//", url.netloc, url.path))
                    if url.netloc
                    else url.path.lstrip("/")
                )
                path = path.rstrip("/") + "/channeldata.json"
                try:  # Skip if file is not accessible
                    with open(path) as f:
                        channeldata = json.load(f)
                except OSError as err:
                    self.log.info("[jupyter_conda] Error: {}".format(str(err)))
                else:
                    pkg_info.update(channeldata["packages"])
            else:
                try:  # Skip if file is not accessible
                    response = yield client.fetch(
                        httpclient.HTTPRequest(
                            url_path_join(channel, "channeldata.json"),
                            headers={"Content-Type": "application/json"},
                        )
                    )
                except (httpclient.HTTPClientError, ConnectionError) as e:
                    self.log.info(
                        "[jupyter_conda] Error getting {}/channeldata.json: {}".format(
                            channel, str(e)
                        )
                    )
                else:
                    channeldata = response.body.decode("utf-8")
                    pkg_info.update(json.loads(channeldata)["packages"])

        # Example structure channeldata['packages'] for channeldata_version == 1
        # "tmpc0d7d950": {
        #     "activate.d": false,
        #     "binary_prefix": false,
        #     "deactivate.d": false,
        #     "identifiers": [],
        #     "keywords": [
        #         "['package', 'tmpc0d7d950']"
        #     ],
        #     "license": "MIT",
        #     "post_link": false,
        #     "pre_link": false,
        #     "pre_unlink": false,
        #     "reference_package": "win-64/tmpc0d7d950-0.1.0.dev1-py36_0.tar.bz2",
        #     "run_exports": {},
        #     "subdirs": [
        #         "win-64"
        #     ],
        #     "summary": "Dummy package",
        #     "tags": [],
        #     "text_prefix": false,
        #     "version": "0.1.0.dev1"
        # }

        # Update channel and add some info
        for package in packages:
            name = package["name"]
            if name in pkg_info:
                package["summary"] = pkg_info[name].get("summary", "")
                package["home"] = pkg_info[name].get("home", "")
                package["keywords"] = pkg_info[name].get("keywords", [])
                package["tags"] = pkg_info[name].get("tags", [])

            # Convert to short channel names
            channel, _ = os.path.split(package["channel"])
            if channel in tr_channels:
                package["channel"] = tr_channels[channel]

        return sorted(packages, key=lambda entry: entry.get("name"))

    @gen.coroutine
    def check_update(self, env, packages):
        output = yield self._execute(
            CONDA_EXE + " update --dry-run -q --json -n " + env, *packages
        )
        data = self.clean_conda_json(output)

        # Data structure in LINK
        #   List of dictionary. Example:
        # {
        #     "base_url": null,
        #     "build_number": 0,
        #     "build_string": "mkl",
        #     "channel": "defaults",
        #     "dist_name": "blas-1.0-mkl",
        #     "name": "blas",
        #     "platform": null,
        #     "version": "1.0"
        # }

        if "error" in data:
            # we didn't get back a list of packages, we got a dictionary with
            # error info
            return data
        elif "actions" in data:
            links = data["actions"].get("LINK", [])
            package_versions = [link for link in links]
            return {
                "updates": [
                    normalize_pkg_info(pkg_version) for pkg_version in package_versions
                ]
            }
        else:
            # no action plan returned means everything is already up to date
            return {"updates": []}

    @gen.coroutine
    def install_packages(self, env, packages):
        output = yield self._execute(
            CONDA_EXE + " install -y -q --json -n " + env, *packages
        )
        return self.clean_conda_json(output)

    @gen.coroutine
    def update_packages(self, env, packages):
        output = yield self._execute(
            CONDA_EXE + " update -y -q --json -n " + env, *packages
        )
        return self.clean_conda_json(output)

    @gen.coroutine
    def remove_packages(self, env, packages):
        output = yield self._execute(
            CONDA_EXE + " remove -y -q --json -n " + env, *packages
        )
        return self.clean_conda_json(output)

    @gen.coroutine
    def package_search(self, env, q):
        # this method is slow
        output = yield self._execute(CONDA_EXE + " search --json -n " + env, q)
        data = self.clean_conda_json(output)

        if "error" in data:
            # we didn't get back a list of packages, we got a dictionary with
            # error info
            return data

        packages = []

        for entries in data.values():
            max_version = None
            max_version_entry = None

            for entry in entries:
                version = parse(entry.get("version", ""))

                if max_version is None or version > max_version:
                    max_version = version
                    max_version_entry = entry

            packages.append(max_version_entry)

        return {"packages": sorted(packages, key=lambda entry: entry.get("name"))}

import asyncio
import json
import random
import os
import sys
import unittest
import unittest.mock as mock
from itertools import chain

try:
    from unittest.mock import AsyncMock
except ImportError:
    AsyncMock = None
import uuid
import tempfile

from nb_conda_kernels import CondaKernelSpecManager
import tornado
from traitlets.config import Config

from mamba_gator.envmanager import EnvManager
from mamba_gator.handlers import AVAILABLE_CACHE, PackagesHandler
from mamba_gator.tests.utils import ServerTest, assert_http_error

from .utils import has_mamba


def generate_name() -> str:
    """Generate a random name."""
    return "_" + uuid.uuid4().hex


class JupyterCondaAPITest(ServerTest):
    def setUp(self):
        super(JupyterCondaAPITest, self).setUp()
        self.env_names = []
        self.pkg_name = "alabaster"

    def tearDown(self):
        # Remove created environment
        for n in self.env_names:
            self.wait_for_task(self.rm_env, n)
        super(JupyterCondaAPITest, self).tearDown()

    def wait_for_task(self, call, *args, **kwargs):
        r = call(*args, **kwargs)
        self.assertEqual(r.status_code, 202)
        location = r.headers["Location"]
        self.assertRegex(location, r"^/conda/tasks/\d+$")
        return self.wait_task(location)

    def mk_env(self, name=None, packages=None, remove_if_exists=True):
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        new_name = name or generate_name()
        if remove_if_exists and new_name in env_names:
            self.wait_for_task(self.rm_env)
        self.env_names.append(new_name)

        return self.conda_api.post(
            ["environments"],
            body={"name": new_name, "packages": packages or ["python"]},
        )

    def rm_env(self, name):
        answer = self.conda_api.delete(["environments", name])
        if name in self.env_names:
            self.env_names.remove(name)
        return answer


class TestChannelsHandler(JupyterCondaAPITest):
    def test_get_list_channels(self):
        answer = self.conda_api.get(["channels"])
        self.assertEqual(answer.status_code, 200)
        data = answer.json()
        self.assertIn("channels", data)
        self.assertIsInstance(data["channels"], dict)

    def test_fail_get(self):
        with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
            error_msg = "Fail to get channels"
            r = {"error": True, "message": error_msg}
            rvalue = (1, json.dumps(r))
            f.return_value = (
                tornado.gen.maybe_future(rvalue) if AsyncMock is None else rvalue
            )
            with assert_http_error(500, msg=error_msg):
                self.conda_api.get(["channels"])

    def test_deployment(self):
        with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
            local_channel = (
                "C:/Users/Public/conda-channel"
                if sys.platform == "win32"
                else "/usr/local/share/conda-channel"
            )
            strip_channel = local_channel.strip("/")
            data = {
                "channel_alias": {
                    "auth": None,
                    "location": "conda.anaconda.org",
                    "name": None,
                    "package_filename": None,
                    "platform": None,
                    "scheme": "https",
                    "token": None,
                },
                "channels": ["defaults", "conda-forge", local_channel],
                "custom_channels": {
                    strip_channel: {
                        "auth": None,
                        "location": "",
                        "name": strip_channel,
                        "package_filename": None,
                        "platform": None,
                        "scheme": "file",
                        "token": None,
                    }
                },
                "custom_multichannels": {
                    "defaults": [
                        {
                            "auth": None,
                            "location": "repo.anaconda.com",
                            "name": "pkgs/main",
                            "package_filename": None,
                            "platform": None,
                            "scheme": "https",
                            "token": None,
                        },
                        {
                            "auth": None,
                            "location": "repo.anaconda.com",
                            "name": "pkgs/r",
                            "package_filename": None,
                            "platform": None,
                            "scheme": "https",
                            "token": None,
                        },
                    ],
                    "local": [
                        {
                            "auth": None,
                            "location": "",
                            "name": strip_channel,
                            "package_filename": None,
                            "platform": None,
                            "scheme": "file",
                            "token": None,
                        }
                    ],
                },
            }
            rvalue = (0, json.dumps(data))
            f.return_value = (
                tornado.gen.maybe_future(rvalue) if AsyncMock is None else rvalue
            )

            response = self.conda_api.get(["channels"])
            self.assertEqual(response.status_code, 200)

            body = response.json()
            channels = body["channels"]
            local = "file:///" if sys.platform == "win32" else "file://"
            expected = {
                strip_channel: [local + local_channel],
                "defaults": [
                    "https://repo.anaconda.com/pkgs/main",
                    "https://repo.anaconda.com/pkgs/r",
                ],
                "conda-forge": ["https://conda.anaconda.org/conda-forge"],
            }
            self.assertEqual(channels, expected)


class TestEnvironmentsHandler(JupyterCondaAPITest):
    def test_get(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        envs = self.conda_api.envs()
        env = None
        for e in envs["environments"]:
            if n == e["name"]:
                env = e
                break
        self.assertIsNotNone(env)
        self.assertEqual(env["name"], n)
        self.assertTrue(os.path.isdir(env["dir"]))
        self.assertFalse(env["is_default"])

    def test_failed_get(self):
        with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
            msg = "Fail to get environments"
            err = {"error": True, "message": msg}
            rvalue = (1, json.dumps(err))
            f.return_value = (
                tornado.gen.maybe_future(rvalue) if AsyncMock is None else rvalue
            )
            with assert_http_error(500, msg=msg):
                self.conda_api.get(["environments"])

    def test_root(self):
        self.wait_for_task(self.mk_env, generate_name())
        envs = self.conda_api.envs()
        root = filter(lambda env: env["name"] == "base", envs["environments"])
        self.assertEqual(len(list(root)), 1)

    def test_env_create_and_destroy(self):
        # Creating an existing environment does not induce error
        n = generate_name()
        response = self.wait_for_task(self.mk_env, n)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

        response = self.wait_for_task(self.rm_env, n)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertNotIn(n, env_names)

        response = self.wait_for_task(self.mk_env, n, remove_if_exists=True)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

        response = self.wait_for_task(self.rm_env, n)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertNotIn(n, env_names)

    def test_empty_environment(self):
        n = generate_name()
        self.env_names.append(n)
        response = self.wait_for_task(
            self.conda_api.post, ["environments"], body={"name": n}
        )
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

    def cp_env(self, name, new_name):
        self.env_names.append(new_name)
        return self.conda_api.post(
            ["environments"], body={"name": new_name, "twin": name}
        )

    def test_env_clone(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        clone_name = n + "-copy"
        response = self.wait_for_task(self.cp_env, n, clone_name)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(clone_name, env_names)

        response = self.wait_for_task(self.rm_env, clone_name)
        self.assertEqual(response.status_code, 200)
        self.wait_for_task(self.rm_env, n)

    def test_environment_yaml_import(self):
        if has_mamba:
            self.skipTest("FIXME not working with mamba")

        n = generate_name()
        self.env_names.append(n)
        build = {"linux": "h0371630_0", "win32": "h8c8aaf0_1", "darwin": "h359304d_0"}
        build_str = build[sys.platform]
        content = """name: test_conda
channels:
- conda-forge
- defaults
dependencies:
- astroid=2.2.5=py37_0
- ipykernel=5.1.1=py37h39e3cac_0
- python=3.7.3={}
- pip:
    - cycler==0.10.0
prefix: /home/user/.conda/envs/lab_conda
        """.format(
            build_str
        )

        expected = [
            ("astroid", "2.2.5", "py37_0"),
            ("ipykernel", "5.1.1", "py37h39e3cac_0"),
            ("python", "3.7.3", build_str),
            ("cycler", "0.10.0", "pypi_0"),
        ]

        def g():
            return self.conda_api.post(
                ["environments"],
                body={"name": n, "file": content, "filename": "testenv.yml"},
            )

        response = self.wait_for_task(g)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

        r = self.conda_api.get(["environments", n])
        pkgs = r.json().get("packages", [])
        packages = list(
            map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs)
        )
        for p in expected:
            self.assertIn(p, packages, "{} not found.".format(p))

    def test_environment_text_import(self):
        n = generate_name()
        self.env_names.append(n)
        build = {"linux": "h0371630_0", "win32": "h8c8aaf0_1", "darwin": "h359304d_0"}
        build_str = build[sys.platform]
        # pip package are not supported by text export file
        content = """# This file may be used to create an environment using:
# $ conda create --name <env> --file <this file>
# platform: linux-64
astroid=2.2.5=py37_0
ipykernel=5.1.1=py37h39e3cac_0
python=3.7.3={}
        """.format(
            build_str
        )

        expected = [
            ("astroid", "2.2.5", "py37_0"),
            ("ipykernel", "5.1.1", "py37h39e3cac_0"),
            ("python", "3.7.3", build_str),
        ]

        def g():
            return self.conda_api.post(
                ["environments"], body={"name": n, "file": content}
            )

        response = self.wait_for_task(g)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

        r = self.conda_api.get(["environments", n])
        pkgs = r.json().get("packages", [])
        packages = list(
            map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs)
        )
        for p in expected:
            self.assertIn(p, packages, "{} not found.".format(p))

    def test_update_env_yaml(self):
        if has_mamba:
            self.skipTest("FIXME not working with mamba")

        n = generate_name()
        response = self.wait_for_task(self.mk_env, n, ["python=3.7",])
        self.assertEqual(response.status_code, 200)

        content = """name: test_conda
channels:
- conda-forge
- defaults
dependencies:
- astroid=2.2.5=py37_0
- pip:
    - cycler==0.10.0
prefix: /home/user/.conda/envs/lab_conda
        """

        expected = [
            ("astroid", "2.2.5", "py37_0"),
            ("cycler", "0.10.0", "pypi_0"),
        ]

        def g():
            return self.conda_api.patch(
                ["environments", n], body={"file": content, "filename": "testenv.yml"},
            )

        response = self.wait_for_task(g)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

        r = self.conda_api.get(["environments", n])
        pkgs = r.json().get("packages", [])
        packages = list(
            map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs)
        )
        for p in expected:
            self.assertIn(p, packages, "{} not found.".format(p))

    def test_update_env_no_filename(self):
        if has_mamba:
            self.skipTest("FIXME not working with mamba")
            
        n = generate_name()
        response = self.wait_for_task(self.mk_env, n, ["python=3.7",])
        self.assertEqual(response.status_code, 200)

        content = """name: test_conda
channels:
- conda-forge
- defaults
dependencies:
- astroid=2.2.5=py37_0
- pip:
    - cycler==0.10.0
prefix: /home/user/.conda/envs/lab_conda
        """

        expected = [
            ("astroid", "2.2.5", "py37_0"),
            ("cycler", "0.10.0", "pypi_0"),
        ]

        def g():
            return self.conda_api.patch(["environments", n], body={"file": content},)

        response = self.wait_for_task(g)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

        r = self.conda_api.get(["environments", n])
        pkgs = r.json().get("packages", [])
        packages = list(
            map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs)
        )
        for p in expected:
            self.assertIn(p, packages, "{} not found.".format(p))

    def test_update_env_txt(self):
        n = generate_name()
        response = self.wait_for_task(self.mk_env, n, ["python=3.7",])
        self.assertEqual(response.status_code, 200)

        content = """# This file may be used to create an environment using:
# $ conda create --name <env> --file <this file>
# platform: linux-64
astroid=2.2.5=py37_0
        """

        expected = [
            ("astroid", "2.2.5", "py37_0"),
        ]

        def g():
            return self.conda_api.patch(
                ["environments", n], body={"file": content, "filename": "testenv.txt"},
            )

        response = self.wait_for_task(g)
        self.assertEqual(response.status_code, 200)
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        self.assertIn(n, env_names)

        r = self.conda_api.get(["environments", n])
        pkgs = r.json().get("packages", [])
        packages = list(
            map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs)
        )
        for p in expected:
            self.assertIn(p, packages, "{} not found.".format(p))


class TestEnvironmentsHandlerWhiteList(JupyterCondaAPITest):
    @mock.patch("nb_conda_kernels.manager.CACHE_TIMEOUT", 0)
    def test_get_whitelist(self):
        n = "banana"
        self.wait_for_task(self.mk_env, n, packages=["ipykernel",])
        manager = CondaKernelSpecManager()
        manager.whitelist = set(["conda-env-banana-py",])
        env_manager = TestEnvironmentsHandlerWhiteList.notebook.web_app.settings["env_manager"]
        env_manager._kernel_spec_manager = manager

        r = self.conda_api.get(["environments",], params={"whitelist": 1})
        self.assertEqual(r.status_code, 200)
        envs = r.json()
        env = None
        for e in envs["environments"]:
            if n == e["name"]:
                env = e
                break
        self.assertIsNotNone(env)
        self.assertEqual(env["name"], n)
        self.assertTrue(os.path.isdir(env["dir"]))
        self.assertFalse(env["is_default"])
        found_env = len(envs["environments"])
        self.assertEqual(found_env, 2)

        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        r = self.conda_api.get(["environments",], params={"whitelist": 1})
        self.assertEqual(r.status_code, 200)
        envs = r.json()
        self.assertEqual(len(envs["environments"]), found_env)


class TestEnvironmentHandler(JupyterCondaAPITest):
    def test_delete(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        r = self.wait_for_task(self.conda_api.delete, ["environments", n])
        self.assertEqual(r.status_code, 200)

    def test_delete_not_existing(self):
        # Deleting not existing environment does not raise an error
        n = generate_name()

        r = self.wait_for_task(self.conda_api.delete, ["environments", n])
        self.assertEqual(r.status_code, 200)

    def test_get(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        r = self.conda_api.get(["environments", n])
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("packages", body)

    def test_fail_get(self):
        n = generate_name()
        with assert_http_error(500, msg="h"):
            self.conda_api.get(["environments", n])

    def test_get_has_update(self):
        n = generate_name()
        self.env_names.append(n)
        self.wait_for_task(
            self.conda_api.post,
            ["environments"],
            body={"name": n, "packages": ["python"]},
        )

        r = self.wait_for_task(
            self.conda_api.get, ["environments", n], params={"status": "has_update"}
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(len(body["updates"]), 0)

        n = generate_name()
        self.env_names.append(n)
        self.wait_for_task(
            self.conda_api.post,
            ["environments"],
            body={"name": n, "packages": ["python", "alabaster=0.7.11"]},
        )

        r = self.wait_for_task(
            self.conda_api.get, ["environments", n], params={"status": "has_update"}
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertGreaterEqual(len(body["updates"]), 1)
        names = map(lambda p: p["name"], body["updates"])
        self.assertIn("alabaster", names)

    def test_env_export(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        r = self.conda_api.get(["environments", n], params={"download": 1, "history": 0})
        self.assertEqual(r.status_code, 200)

        content = r.text
        self.assertRegex(content, r"name: " + n)
        self.assertRegex(content, r"channels:")
        self.assertRegex(content, r"dependencies:")
        self.assertRegex(content, r"- python=\d\.\d+\.\d+=\w+")
        self.assertRegex(content, r"prefix:")

    def test_env_export_history(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        r = self.conda_api.get(
            ["environments", n], params={"download": 1, "history": 1}
        )
        self.assertEqual(r.status_code, 200)

        content = " ".join(r.text.splitlines())
        self.assertRegex(
            content, r"^name:\s" + n + r"\s+channels:(\s+- conda-forge)?\s+- defaults\s+dependencies:\s+- python\s+prefix:"
        )

    def test_env_export_not_supporting_history(self):
        try:
            n = generate_name()
            self.wait_for_task(self.mk_env, n)
            EnvManager._conda_version = (4, 6, 0)
            r = self.conda_api.get(
                ["environments", n], params={"download": 1, "history": 1}
            )
            self.assertEqual(r.status_code, 200)

            content = r.text
            self.assertRegex(content, r"name: " + n)
            self.assertRegex(content, r"channels:")
            self.assertRegex(content, r"dependencies:")
            self.assertRegex(content, r"- python=\d\.\d+\.\d+=\w+")
            self.assertRegex(content, r"prefix:")
        finally:
            EnvManager._conda_version = None


class TestCondaVersion(JupyterCondaAPITest):
    def test_version(self):
        EnvManager._conda_version = None
        self.assertIsNone(EnvManager._conda_version)
        self.conda_api.get(
            ["environments",]
        )
        self.assertIsNotNone(EnvManager._conda_version)


class TestPackagesEnvironmentHandler(JupyterCondaAPITest):
    def test_pkg_install_and_remove(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        r = self.wait_for_task(
            self.conda_api.post,
            ["environments", n, "packages"],
            body={"packages": [self.pkg_name]},
        )
        self.assertEqual(r.status_code, 200)
        r = self.conda_api.get(["environments", n])
        pkgs = r.json()["packages"]
        v = None
        for p in pkgs:
            if p["name"] == self.pkg_name:
                v = p
                break
        self.assertIsNotNone(v)

        r = self.wait_for_task(
            self.conda_api.delete,
            ["environments", n, "packages"],
            body={"packages": [self.pkg_name]},
        )
        self.assertEqual(r.status_code, 200)
        r = self.conda_api.get(["environments", n])
        pkgs = r.json()["packages"]
        v = None
        for p in pkgs:
            if p["name"] == self.pkg_name:
                v = p
                break
        self.assertIsNone(v)

    def test_pkg_install_with_version_constraints(self):
        test_pkg = "alabaster"
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        r = self.wait_for_task(
            self.conda_api.post,
            ["environments", n, "packages"],
            body={"packages": [test_pkg + "==0.7.12"]},
        )
        self.assertEqual(r.status_code, 200)
        r = self.conda_api.get(["environments", n])
        pkgs = r.json()["packages"]
        v = None
        for p in pkgs:
            if p["name"] == test_pkg:
                v = p
                break
        self.assertEqual(v["version"], "0.7.12")

        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        r = self.wait_for_task(
            self.conda_api.post,
            ["environments", n, "packages"],
            body={"packages": [test_pkg + ">=0.7.10"]},
        )
        self.assertEqual(r.status_code, 200)
        r = self.conda_api.get(["environments", n])
        pkgs = r.json()["packages"]
        v = None
        for p in pkgs:
            if p["name"] == test_pkg:
                v = tuple(map(int, p["version"].split(".")))
                break
        self.assertGreaterEqual(v, (0, 7, 10))

        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        r = self.wait_for_task(
            self.conda_api.post,
            ["environments", n, "packages"],
            body={"packages": [test_pkg + ">=0.7.10,<0.7.13"]},
        )
        self.assertEqual(r.status_code, 200)
        r = self.conda_api.get(["environments", n])
        pkgs = r.json()["packages"]
        v = None
        for p in pkgs:
            if p["name"] == test_pkg:
                v = tuple(map(int, p["version"].split(".")))
                break
        self.assertGreaterEqual(v, (0, 7, 10))
        self.assertLess(v, (0, 7, 13))

    def test_package_install_development_mode(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        pkg_name = "banana"
        with tempfile.TemporaryDirectory() as folder:
            os.mkdir(os.path.join(folder, pkg_name))
            with open(os.path.join(folder, pkg_name, "__init__.py"), "w+") as f:
                f.write("")
            with open(os.path.join(folder, "setup.py"), "w+") as f:
                f.write("from setuptools import setup\n")
                f.write("setup(name='{}')\n".format(pkg_name))

            self.wait_for_task(
                self.conda_api.post,
                ["environments", n, "packages"],
                body={"packages": [folder]},
                params={"develop": 1},
            )

            r = self.conda_api.get(["environments", n])
            body = r.json()

            v = None
            for p in body["packages"]:
                if p["name"] == pkg_name:
                    v = p
                    break
            self.assertEqual(v["channel"], "<develop>")
            self.assertEqual(v["platform"], "pypi")

    def test_package_install_development_mode_url_path(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        pkg_name = generate_name()[1:]
        folder = os.path.join(self.notebook.contents_manager.root_dir, pkg_name)
        os.mkdir(folder)
        os.mkdir(os.path.join(folder, pkg_name))
        with open(os.path.join(folder, pkg_name, "__init__.py"), "w+") as f:
            f.write("")
        with open(os.path.join(folder, "setup.py"), "w+") as f:
            f.write("from setuptools import setup\n")
            f.write("setup(name='{}')\n".format(pkg_name))

        self.wait_for_task(
            self.conda_api.post,
            ["environments", n, "packages"],
            body={"packages": [pkg_name]},
            params={"develop": 1},
        )

        r = self.conda_api.get(["environments", n])
        body = r.json()

        v = None
        for p in body["packages"]:
            if p["name"] == pkg_name:
                v = p
                break
        self.assertEqual(v["channel"], "<develop>")
        self.assertEqual(v["platform"], "pypi")

    def test_pkg_update(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        r = self.wait_for_task(self.conda_api.patch, ["environments", n, "packages"])
        self.assertEqual(r.status_code, 200)


class TestPackagesHandler(JupyterCondaAPITest):
    def test_package_search(self):
        r = self.wait_for_task(
            self.conda_api.get, ["packages"], params={"query": self.pkg_name}
        )
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("packages", body)
        v = None
        for p in body["packages"]:
            if p["name"] == self.pkg_name:
                v = p
                break
        self.assertIsNotNone(v)

    def test_package_list_available(self):
        with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", generate_name()):
            with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
                dummy = {
                    "numpy_sugar": [
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "380115a180acf251faaf754ff37cab8f",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                            "size": 46560,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "version": "1.0.6",
                        },
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "6306fdf5d1f3fad5049f282b63e95403",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                            "size": 46738,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "version": "1.0.8",
                        },
                    ],
                    "numpydoc": [
                        {
                            "arch": None,
                            "build": "py36_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "constrains": [],
                            "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                            "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "f96891e9071727dfca3ea480408396f6",
                            "name": "numpydoc",
                            "platform": None,
                            "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                            "size": 43791,
                            "subdir": "win-64",
                            "timestamp": 1522687759543,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_1",
                            "build_number": 1,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                            "size": 21577,
                            "subdir": "noarch",
                            "timestamp": 1531243883293,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "081b5590105257246eada8a8bc5dd0aa",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                            "size": 32151,
                            "subdir": "noarch",
                            "timestamp": 1555950366084,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                            "version": "0.9.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "de8a98b573872ba539fe7e68e106178a",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                            "size": 29774,
                            "subdir": "noarch",
                            "timestamp": 1556022967544,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                            "version": "0.9.1",
                        },
                    ],
                }
                channels = {
                    "channel_alias": {
                        "auth": None,
                        "location": "conda.anaconda.org",
                        "name": None,
                        "package_filename": None,
                        "platform": None,
                        "scheme": "https",
                        "token": None,
                    },
                    "channels": ["defaults"],
                    "custom_multichannels": {
                        "defaults": [
                            {
                                "auth": None,
                                "location": "repo.anaconda.com",
                                "name": "pkgs/main",
                                "package_filename": None,
                                "platform": None,
                                "scheme": "https",
                                "token": None,
                            }
                        ]
                    },
                    "ssl_verify": False,
                }

                if has_mamba:
                    # Change dummy to match mamba repoquery format
                    dummy = {
                        "result": {
                            "pkgs": list(chain(*dummy.values()))
                        }
                    }

                rvalue = [
                    (0, json.dumps(dummy)),
                    (0, json.dumps(channels)),
                ]
                # Use side_effect to have a different return value for each call
                f.side_effect = (
                    map(tornado.gen.maybe_future, rvalue)
                    if AsyncMock is None
                    else rvalue
                )

                r = self.wait_for_task(self.conda_api.get, ["packages"])
                self.assertEqual(r.status_code, 200)

                args, _ = f.call_args_list[0]
                if has_mamba:
                    self.assertSequenceEqual(args[1:], ["repoquery", "search", "*", "--json"])
                else:
                    self.assertSequenceEqual(args[1:], ["search", "--json"])

                body = r.json()

                expected = {
                    "packages": [
                        {
                            "build_number": [0, 0],
                            "build_string": ["py35_vc14_0", "py35_vc14_0"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "name": "numpy_sugar",
                            "platform": None,
                            "version": ["1.0.6", "1.0.8"],
                            "summary": "",
                            "home": "",
                            "keywords": [],
                            "tags": [],
                        },
                        {
                            "build_number": [1, 0, 0],
                            "build_string": ["py_1", "py_0", "py_0"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "name": "numpydoc",
                            "platform": None,
                            "version": ["0.8.0", "0.9.0", "0.9.1"],
                            "summary": "Numpy's Sphinx extensions",
                            "home": "https://github.com/numpy/numpydoc",
                            "keywords": [],
                            "tags": [],
                        },
                    ],
                    "with_description": True,
                }
                self.assertEqual(body, expected)

    @unittest.skipIf(sys.platform.startswith("win"), "TODO test not enough reliability")
    def test_package_list_available_local_channel(self):
        with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", generate_name()):
            with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
                dummy = {
                    "numpy_sugar": [
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "380115a180acf251faaf754ff37cab8f",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                            "size": 46560,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "version": "1.0.6",
                        },
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "6306fdf5d1f3fad5049f282b63e95403",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                            "size": 46738,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "version": "1.0.8",
                        },
                    ],
                    "numpydoc": [
                        {
                            "arch": None,
                            "build": "py36_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "constrains": [],
                            "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                            "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "f96891e9071727dfca3ea480408396f6",
                            "name": "numpydoc",
                            "platform": None,
                            "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                            "size": 43791,
                            "subdir": "win-64",
                            "timestamp": 1522687759543,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_1",
                            "build_number": 1,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                            "size": 21577,
                            "subdir": "noarch",
                            "timestamp": 1531243883293,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "081b5590105257246eada8a8bc5dd0aa",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                            "size": 32151,
                            "subdir": "noarch",
                            "timestamp": 1555950366084,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                            "version": "0.9.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "de8a98b573872ba539fe7e68e106178a",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                            "size": 29774,
                            "subdir": "noarch",
                            "timestamp": 1556022967544,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                            "version": "0.9.1",
                        },
                    ],
                }

                if has_mamba:
                    # Change dummy to match mamba repoquery format
                    dummy = {
                        "result": {
                            "pkgs": list(chain(*dummy.values()))
                        }
                    }

                with tempfile.TemporaryDirectory() as local_channel:
                    with open(
                        os.path.join(local_channel, "channeldata.json"), "w+"
                    ) as d:
                        d.write(
                            '{ "channeldata_version": 1, "packages": { "numpydoc": { "activate.d": false, "binary_prefix": false, "deactivate.d": false, "description": "Numpy\'s documentation uses several custom extensions to Sphinx. These are shipped in this numpydoc package, in case you want to make use of them in third-party projects.", "dev_url": "https://github.com/numpy/numpydoc", "doc_source_url": "https://github.com/numpy/numpydoc/blob/master/README.rst", "doc_url": "https://pypi.python.org/pypi/numpydoc", "home": "https://github.com/numpy/numpydoc", "icon_hash": null, "icon_url": null, "identifiers": null, "keywords": null, "license": "BSD 3-Clause", "post_link": false, "pre_link": false, "pre_unlink": false, "recipe_origin": null, "run_exports": {}, "source_git_url": null, "source_url": "https://pypi.io/packages/source/n/numpydoc/numpydoc-0.9.1.tar.gz", "subdirs": [ "linux-32", "linux-64", "linux-ppc64le", "noarch", "osx-64", "win-32", "win-64" ], "summary": "Numpy\'s Sphinx extensions", "tags": null, "text_prefix": false, "timestamp": 1556032044, "version": "0.9.1" } }, "subdirs": [ "noarch" ] }'
                        )
                    local_name = local_channel.strip("/")
                    channels = {
                        "channel_alias": {},
                        "channels": [local_channel],
                        "custom_multichannels": {},
                        "custom_channels": {
                            local_name: {
                                "auth": None,
                                "location": "",
                                "name": local_name,
                                "package_filename": None,
                                "platform": None,
                                "scheme": "file",
                                "token": None,
                            }
                        },
                    }

                    rvalue = [
                        (0, json.dumps(dummy)),
                        (0, json.dumps(channels)),
                    ]
                    # Use side_effect to have a different return value for each call
                    f.side_effect = (
                        map(tornado.gen.maybe_future, rvalue)
                        if AsyncMock is None
                        else rvalue
                    )

                    r = self.wait_for_task(self.conda_api.get, ["packages"])
                    self.assertEqual(r.status_code, 200)

                    args, _ = f.call_args_list[0]
                    if has_mamba:
                        self.assertSequenceEqual(args[1:], ["repoquery", "search", "*", "--json"])
                    else:
                        self.assertSequenceEqual(args[1:], ["search", "--json"])

                    body = r.json()

                    expected = {
                        "packages": [
                            {
                                "build_number": [0, 0],
                                "build_string": ["py35_vc14_0", "py35_vc14_0"],
                                "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                                "name": "numpy_sugar",
                                "platform": None,
                                "version": ["1.0.6", "1.0.8"],
                                "summary": "",
                                "home": "",
                                "keywords": [],
                                "tags": [],
                            },
                            {
                                "build_number": [1, 0, 0],
                                "build_string": ["py_1", "py_0", "py_0"],
                                "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                                "name": "numpydoc",
                                "platform": None,
                                "version": ["0.8.0", "0.9.0", "0.9.1"],
                                "summary": "Numpy's Sphinx extensions",
                                "home": "https://github.com/numpy/numpydoc",
                                "keywords": [],
                                "tags": [],
                            },
                        ],
                        "with_description": True,
                    }
                    self.assertEqual(body, expected)

    @unittest.skipIf(sys.platform.startswith("win"), "not reliable on Windows")
    def test_package_list_available_no_description(self):
        with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", generate_name()):
            with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
                dummy = {
                    "numpy_sugar": [
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "380115a180acf251faaf754ff37cab8f",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                            "size": 46560,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "version": "1.0.6",
                        },
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "6306fdf5d1f3fad5049f282b63e95403",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                            "size": 46738,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "version": "1.0.8",
                        },
                    ],
                    "numpydoc": [
                        {
                            "arch": None,
                            "build": "py36_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "constrains": [],
                            "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                            "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "f96891e9071727dfca3ea480408396f6",
                            "name": "numpydoc",
                            "platform": None,
                            "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                            "size": 43791,
                            "subdir": "win-64",
                            "timestamp": 1522687759543,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_1",
                            "build_number": 1,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                            "size": 21577,
                            "subdir": "noarch",
                            "timestamp": 1531243883293,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "081b5590105257246eada8a8bc5dd0aa",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                            "size": 32151,
                            "subdir": "noarch",
                            "timestamp": 1555950366084,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                            "version": "0.9.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "de8a98b573872ba539fe7e68e106178a",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                            "size": 29774,
                            "subdir": "noarch",
                            "timestamp": 1556022967544,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                            "version": "0.9.1",
                        },
                    ],
                }

                if has_mamba:
                    # Change dummy to match mamba repoquery format
                    dummy = {
                        "result": {
                            "pkgs": list(chain(*dummy.values()))
                        }
                    }

                with tempfile.TemporaryDirectory() as local_channel:
                    local_name = local_channel.strip("/")
                    channels = {
                        "channel_alias": {},
                        "channels": [local_channel],
                        "custom_multichannels": {},
                        "custom_channels": {
                            local_name: {
                                "auth": None,
                                "location": "",
                                "name": local_name,
                                "package_filename": None,
                                "platform": None,
                                "scheme": "file",
                                "token": None,
                            }
                        },
                    }

                    rvalue = [
                        (0, json.dumps(dummy)),
                        (0, json.dumps(channels)),
                    ]
                    # Use side_effect to have a different return value for each call
                    f.side_effect = (
                        map(tornado.gen.maybe_future, rvalue)
                        if AsyncMock is None
                        else rvalue
                    )

                    r = self.wait_for_task(self.conda_api.get, ["packages"])
                    self.assertEqual(r.status_code, 200)

                    args, _ = f.call_args_list[0]
                    if has_mamba:
                        self.assertSequenceEqual(args[1:], ["repoquery", "search", "*", "--json"])
                    else:
                        self.assertSequenceEqual(args[1:], ["search", "--json"])

                    body = r.json()

                    expected = {
                        "packages": [
                            {
                                "build_number": [0, 0],
                                "build_string": ["py35_vc14_0", "py35_vc14_0"],
                                "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                                "name": "numpy_sugar",
                                "platform": None,
                                "version": ["1.0.6", "1.0.8"],
                                "summary": "",
                                "home": "",
                                "keywords": [],
                                "tags": [],
                            },
                            {
                                "build_number": [1, 0, 0],
                                "build_string": ["py_1", "py_0", "py_0"],
                                "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                                "name": "numpydoc",
                                "platform": None,
                                "version": ["0.8.0", "0.9.0", "0.9.1"],
                                "summary": "",
                                "home": "",
                                "keywords": [],
                                "tags": [],
                            },
                        ],
                        "with_description": False,
                    }
                    self.assertEqual(body, expected)

    def test_package_list_available_caching(self):
        cache_name = generate_name()
        with mock.patch("mamba_gator.handlers.AVAILABLE_CACHE", cache_name):
            with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
                dummy = {
                    "numpy_sugar": [
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "380115a180acf251faaf754ff37cab8f",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "8bba4c5179a7e40f0c03861df9dfc1fd7827322e76d0b646a29bee055b0b727a",
                            "size": 46560,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.6-py35_vc14_0.tar.bz2",
                            "version": "1.0.6",
                        },
                        {
                            "arch": None,
                            "build": "py35_vc14_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "constrains": [],
                            "depends": [
                                "cffi",
                                "ncephes",
                                "numba",
                                "numpy",
                                "python 3.5*",
                                "scipy",
                                "vc 14.*",
                            ],
                            "fn": "numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "license": "MIT",
                            "license_family": "MIT",
                            "md5": "6306fdf5d1f3fad5049f282b63e95403",
                            "name": "numpy_sugar",
                            "platform": None,
                            "sha256": "88e41187218af19e587ef43a3a570a6664d2041cfc01f660eae255a284d9ca77",
                            "size": 46738,
                            "subdir": "win-64",
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64/numpy_sugar-1.0.8-py35_vc14_0.tar.bz2",
                            "version": "1.0.8",
                        },
                    ],
                    "numpydoc": [
                        {
                            "arch": None,
                            "build": "py36_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "constrains": [],
                            "depends": ["python >=3.6,<3.7.0a0", "sphinx"],
                            "fn": "numpydoc-0.8.0-py36_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "f96891e9071727dfca3ea480408396f6",
                            "name": "numpydoc",
                            "platform": None,
                            "sha256": "8760ab4d1d04b4c9a455baa6961a2885175d74cafac1e06034f99ff7e2357056",
                            "size": 43791,
                            "subdir": "win-64",
                            "timestamp": 1522687759543,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64/numpydoc-0.8.0-py36_0.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_1",
                            "build_number": 1,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.8.0-py_1.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "5e71b7baaecd06f5c2dfbb1055cb0de3",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "30ae298b7e4b02f2e9fe07e1341c70468a95cb0ab6b38dd18d60de7082935494",
                            "size": 21577,
                            "subdir": "noarch",
                            "timestamp": 1531243883293,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.8.0-py_1.tar.bz2",
                            "version": "0.8.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.0-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "081b5590105257246eada8a8bc5dd0aa",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "8ccc9c59c5b874e7f255270e919fd9f8b6e0a4c62dca48bc4de990f5ceb7da34",
                            "size": 32151,
                            "subdir": "noarch",
                            "timestamp": 1555950366084,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy/noarch/numpydoc-0.9.0-py_0.tar.bz2",
                            "version": "0.9.0",
                        },
                        {
                            "arch": None,
                            "build": "py_0",
                            "build_number": 0,
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch",
                            "constrains": [],
                            "depends": ["python", "sphinx"],
                            "fn": "numpydoc-0.9.1-py_0.tar.bz2",
                            "license": "BSD 3-Clause",
                            "md5": "de8a98b573872ba539fe7e68e106178a",
                            "name": "numpydoc",
                            "noarch": "python",
                            "package_type": "noarch_python",
                            "platform": None,
                            "sha256": "90049dd32972b2e61131ba27c9c4c90b09e701cbba2c6a473d041d7ffa1352c0",
                            "size": 29774,
                            "subdir": "noarch",
                            "timestamp": 1556022967544,
                            "url": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/noarch/numpydoc-0.9.1-py_0.tar.bz2",
                            "version": "0.9.1",
                        },
                    ],
                }
                channels = {
                    "channel_alias": {
                        "auth": None,
                        "location": "conda.anaconda.org",
                        "name": None,
                        "package_filename": None,
                        "platform": None,
                        "scheme": "https",
                        "token": None,
                    },
                    "channels": ["defaults"],
                    "custom_multichannels": {
                        "defaults": [
                            {
                                "auth": None,
                                "location": "repo.anaconda.com",
                                "name": "pkgs/main",
                                "package_filename": None,
                                "platform": None,
                                "scheme": "https",
                                "token": None,
                            }
                        ]
                    },
                    "ssl_verify": False,
                }


                if has_mamba:
                    # Change dummy to match mamba repoquery format
                    dummy = {
                        "result": {
                            "pkgs": list(chain(*dummy.values()))
                        }
                    }

                rvalue = [
                    (0, json.dumps(dummy)),
                    (0, json.dumps(channels)),
                ]
                # Use side_effect to have a different return value for each call
                f.side_effect = (
                    map(tornado.gen.maybe_future, rvalue)
                    if AsyncMock is None
                    else rvalue
                )

                # First retrival no cache available
                r = self.wait_for_task(self.conda_api.get, ["packages"])
                self.assertEqual(r.status_code, 200)

                args, _ = f.call_args_list[0]
                if has_mamba:
                    self.assertSequenceEqual(args[1:], ["repoquery", "search", "*", "--json"])
                else:
                    self.assertSequenceEqual(args[1:], ["search", "--json"])

                expected = {
                    "packages": [
                        {
                            "build_number": [0, 0],
                            "build_string": ["py35_vc14_0", "py35_vc14_0"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy-forge/win-64",
                            "name": "numpy_sugar",
                            "platform": None,
                            "version": ["1.0.6", "1.0.8"],
                            "summary": "",
                            "home": "",
                            "keywords": [],
                            "tags": [],
                        },
                        {
                            "build_number": [1, 0, 0],
                            "build_string": ["py_1", "py_0", "py_0"],
                            "channel": "https://artifactory.server/artifactory/api/conda/conda-proxy/win-64",
                            "name": "numpydoc",
                            "platform": None,
                            "version": ["0.8.0", "0.9.0", "0.9.1"],
                            "summary": "Numpy's Sphinx extensions",
                            "home": "https://github.com/numpy/numpydoc",
                            "keywords": [],
                            "tags": [],
                        },
                    ],
                    "with_description": True,
                }

                cache_file = os.path.join(tempfile.gettempdir(), cache_name + ".json")
                self.assertTrue(os.path.exists(cache_file))

                with open(cache_file) as cache:
                    self.assertEqual(json.load(cache), expected)

                # Retrieve using cache
                r = self.conda_api.get(["packages"])
                self.assertEqual(r.status_code, 200)
                body = r.json()
                self.assertEqual(body, expected)


class TestTasksHandler(JupyterCondaAPITest):
    def test_get_invalid_task(self):
        with assert_http_error(404):
            self.conda_api.get(["tasks", str(random.randint(1, 1200))])

    def test_delete_invalid_task(self):
        with assert_http_error(404):
            self.conda_api.get(["tasks", str(random.randint(1, 1200))])

    def test_delete_task(self):
        r = self.mk_env()
        location = r.headers["Location"]
        _, index = location.rsplit("/", maxsplit=1)
        r = self.conda_api.delete(["tasks", index])
        self.assertEqual(r.status_code, 204)

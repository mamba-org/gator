import asyncio
import json
import os
import random
import re
import sys
import tempfile
import unittest.mock as mock
import uuid
from pathlib import Path
from subprocess import run

import pytest
import tornado
from mamba_gator.envmanager import CONDA_EXE, EnvManager
from mamba_gator.handlers import AVAILABLE_CACHE, NS, PackagesHandler
from mamba_gator.tests.utils import assert_http_error, maybe_future
from nb_conda_kernels import CondaKernelSpecManager


def generate_name() -> str:
    """Generate a random name."""
    return "_" + uuid.uuid4().hex


PKG_NAME = "alabaster"


@pytest.fixture
def get_environments(jp_fetch):
    async def foo():
        response = await jp_fetch(NS, "environments", method="GET")
        return json.loads(response.body)

    return foo


@pytest.fixture
def rm_env(wait_for_task):
    async def foo(name):
        return await wait_for_task(NS, "environments", name, method="DELETE")

    return foo


@pytest.fixture
def mk_env(get_environments, wait_for_task):

    new_name = generate_name()
    
    async def foo(name=None, packages=None):
        nonlocal new_name
        envs = await get_environments()
        env_names = map(lambda env: env["name"], envs["environments"])
        if name is not None:
            new_name = name
        if new_name in env_names:
            await wait_for_task(rm_env, new_name)

        return await wait_for_task(
            NS,
            "environments",
            body=json.dumps({"name": new_name, "packages": packages or ["python"]}),
            method="POST",
        )
        
    yield foo

    try:  # Try to remove the environment if it is still around - the server is done so use subprocess
        run([CONDA_EXE, "env", "remove", "-y", "-q", "-n", new_name])
    except:
        pass


async def test_ChannelsHandler_get_list(jp_fetch):
    answer = await jp_fetch(NS, "channels", method="GET")
    assert answer.code == 200
    data = json.loads(answer.body)
    assert "channels" in data
    assert isinstance(data["channels"], dict)


async def test_ChannelsHandler_fail_get(jp_fetch):
    with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
        error_msg = "Fail to get channels"
        r = {"error": True, "message": error_msg}
        f.return_value = maybe_future((1, json.dumps(r)))

        with assert_http_error(500, error_msg):
            await jp_fetch(NS, "channels", method="GET")


async def test_ChannelsHandler_deployment(jp_fetch):
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
        f.return_value = maybe_future((0, json.dumps(data)))

        response = await jp_fetch(NS, "channels", method="GET")
        assert response.code == 200

        body = json.loads(response.body)
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
        assert channels == expected


async def test_EnvironmentsHandler_get(get_environments, mk_env):
    n = generate_name()
    await mk_env(n)

    envs = await get_environments()

    env = None
    for e in envs["environments"]:
        if n == e["name"]:
            env = e
            break
    assert env is not None
    assert env["name"] == n
    assert os.path.isdir(env["dir"]) == True
    assert env["is_default"] == False

async def test_EnvironmentsHandler_failed_get(get_environments):
    with mock.patch("mamba_gator.envmanager.EnvManager._execute") as f:
        msg = "Fail to get environments"
        err = {"error": True, "message": msg}
        f.return_value = maybe_future((1, json.dumps(err)))

        with assert_http_error(500, msg):
            await get_environments()


async def test_EnvironmentsHandler_root(get_environments, mk_env):
    await mk_env(generate_name())

    envs = await get_environments()

    root = filter(lambda env: env["name"] == "base", envs["environments"])
    assert len(list(root)) == 1


async def test_EnvironmentsHandler_create_and_destroy(mk_env, rm_env, get_environments):
    # Creating an existing environment does not induce error
    n = generate_name()
    response = await mk_env(n)

    assert response.code == 200
    envs = await get_environments()

    env_names = map(lambda env: env["name"], envs["environments"])
    assert n in env_names

    response = await rm_env(n)
    assert response.code == 200

    envs = await get_environments()

    env_names = map(lambda env: env["name"], envs["environments"])
    assert n not in env_names

    response = await mk_env(n)
    assert response.code == 200
    envs = await get_environments()
    env_names = map(lambda env: env["name"], envs["environments"])
    assert n in env_names

    response = await rm_env(n)
    assert response.code == 200
    envs = await get_environments()
    env_names = map(lambda env: env["name"], envs["environments"])
    assert n not in env_names


async def test_EnvironmentsHandler_empty_environment(wait_for_task, get_environments):
    n = generate_name()

    response = await wait_for_task(
        NS, "environments", body=json.dumps({"name": n}), method="POST"
    )
    try:
        assert response.code == 200
        envs = await get_environments()
        env_names = map(lambda env: env["name"], envs["environments"])
        assert n in env_names
    finally:
        await wait_for_task(NS, "environments", n, method="DELETE")


async def test_EnvironmentsHandler_clone(
    wait_for_task, mk_env, get_environments, rm_env
):
    n = generate_name()
    await mk_env(n)
    clone_name = n + "-copy"
    response = await wait_for_task(
        NS,
        "environments",
        body=json.dumps({"name": clone_name, "twin": n}),
        method="POST",
    )
    try:
        assert response.code == 200
        envs = await get_environments()
        env_names = map(lambda env: env["name"], envs["environments"])
        assert clone_name in env_names
    finally:
        response = await rm_env(clone_name)
        assert response.code == 200


async def test_EnvironmentsHandler_yaml_import(
    wait_for_task, get_environments, jp_fetch, rm_env
):
    n = generate_name()
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

    response = await wait_for_task(
        NS,
        "environments",
        body=json.dumps({"name": n, "file": content, "filename": "testenv.yml"}),
        method="POST",
    )
    try:
        assert response.code == 200
        envs = await get_environments()
        env_names = map(lambda env: env["name"], envs["environments"])
        assert n in env_names

        r = await jp_fetch(NS, "environments", n, method="GET")
        pkgs = json.loads(r.body).get("packages", [])
        packages = list(
            map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs)
        )
        for p in expected:
            assert p, packages in "{} not found.".format(p)
    finally:
        await rm_env(n)


async def test_EnvironmentsHandler_text_import(
    jp_fetch, rm_env, wait_for_task, get_environments
):
    n = generate_name()
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

    response = await wait_for_task(
        NS,
        "environments",
        body=json.dumps({"name": n, "file": content}),
        method="POST",
    )
    try:
        assert response.code == 200
        envs = await get_environments()
        env_names = map(lambda env: env["name"], envs["environments"])
        assert n in env_names

        r = await jp_fetch(NS, "environments", n, method="GET")
        pkgs = json.loads(r.body).get("packages", [])
        packages = list(
            map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs)
        )
        for p in expected:
            assert p in packages, f"{p} not found."
    finally:
        await rm_env(n)


async def test_EnvironmentsHandler_update_yaml(
    mk_env, get_environments, wait_for_task, jp_fetch
):
    n = generate_name()
    response = await mk_env(
        n,
        [
            "python=3.7",
        ],
    )
    assert response.code == 200

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

    response = await wait_for_task(
        NS,
        "environments",
        n,
        body=json.dumps({"file": content, "filename": "testenv.yml"}),
        method="PATCH",
    )
    assert response.code == 200
    envs = await get_environments()
    env_names = map(lambda env: env["name"], envs["environments"])
    assert n in env_names

    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body).get("packages", [])
    packages = list(map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs))
    for p in expected:
        assert p, packages in "{} not found.".format(p)


async def test_EnvironmentsHandler_update_no_filename(
    jp_fetch, mk_env, get_environments, wait_for_task
):
    n = generate_name()
    response = await mk_env(
        n,
        [
            "python=3.7",
        ],
    )
    assert response.code == 200

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

    response = await wait_for_task(
        NS, "environments", n, body=json.dumps({"file": content}), method="PATCH"
    )
    assert response.code == 200
    envs = await get_environments()
    env_names = map(lambda env: env["name"], envs["environments"])
    assert n in env_names

    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body).get("packages", [])
    packages = list(map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs))
    for p in expected:
        assert p, packages in "{} not found.".format(p)


async def test_EnvironmentsHandler_update_txt(
    jp_fetch, mk_env, get_environments, wait_for_task
):
    n = generate_name()
    response = await mk_env(
        n,
        [
            "python=3.7",
        ],
    )
    assert response.code == 200

    content = """# This file may be used to create an environment using:
# $ conda create --name <env> --file <this file>
# platform: linux-64
astroid=2.2.5=py37_0
    """

    expected = [
        ("astroid", "2.2.5", "py37_0"),
    ]

    response = await wait_for_task(
        NS,
        "environments",
        n,
        body=json.dumps({"file": content, "filename": "testenv.txt"}),
        method="PATCH",
    )
    assert response.code == 200
    envs = await get_environments()
    env_names = map(lambda env: env["name"], envs["environments"])
    assert n in env_names

    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body).get("packages", [])
    packages = list(map(lambda p: (p["name"], p["version"], p["build_string"]), pkgs))
    for p in expected:
        assert p, packages in "{} not found.".format(p)


@mock.patch("nb_conda_kernels.manager.CACHE_TIMEOUT", 0)
async def test_EnvironmentsHandler_get_whitelist(jp_web_app, jp_fetch, mk_env):
    n = "banana"
    await mk_env(
        n,
        packages=[
            "ipykernel",
        ],
    )
    manager = CondaKernelSpecManager()
    manager.whitelist = set(
        [
            "conda-env-banana-py",
        ]
    )
    env_manager = jp_web_app.settings["env_manager"]
    env_manager._kernel_spec_manager = manager

    r = await jp_fetch(NS, "environments", params={"whitelist": 1}, method="GET")
    assert r.code == 200
    envs = json.loads(r.body)
    env = None
    for e in envs["environments"]:
        if n == e["name"]:
            env = e
            break
    assert env is not None
    assert env["name"] == n
    assert os.path.isdir(env["dir"]) == True
    assert env["is_default"] == False
    found_env = len(envs["environments"])
    assert found_env == 2

    n = generate_name()
    await mk_env(n)
    r = await jp_fetch(NS, "environments", params={"whitelist": 1}, method="GET")
    assert r.code == 200
    envs = json.loads(r.body)
    assert len(envs["environments"]) == found_env


async def test_EnvironmentHandler_delete(mk_env, rm_env):
    n = generate_name()
    await mk_env(n)

    r = await rm_env(n)
    assert r.code == 200


async def test_EnvironmentHandler_delete_not_existing(rm_env):
    # Deleting not existing environment does not raise an error
    n = generate_name()

    r = await rm_env(n)
    assert r.code == 200


async def test_EnvironmentHandler_get(jp_fetch, mk_env):
    n = generate_name()
    await mk_env(n)
    r = await jp_fetch(NS, "environments", n, method="GET")
    assert r.code == 200
    body = json.loads(r.body)
    assert "packages" in body


async def test_EnvironmentHandler_fail_get(jp_fetch):
    n = generate_name()
    with assert_http_error(500, "h"):
        await jp_fetch(NS, "environments", n, method="GET")


async def test_EnvironmentHandler_get_has_no_update(wait_for_task, mk_env):
    n = generate_name()

    await mk_env(n, ["python"])

    r = await wait_for_task(
        NS, "environments", n, params={"status": "has_update"}, method="GET"
    )
    assert r.code == 200
    body = json.loads(r.body)
    assert len(body["updates"]) == 0


async def test_EnvironmentHandler_get_has_update(wait_for_task, mk_env):
    n = generate_name()

    await mk_env(
        n,
        ["python", "alabaster=0.7.11"],
    )

    r = await wait_for_task(
        NS, "environments", n, params={"status": "has_update"}, method="GET"
    )
    assert r.code == 200
    body = json.loads(r.body)
    assert len(body["updates"]) >= 1
    names = map(lambda p: p["name"], body["updates"])
    assert "alabaster" in names


async def test_EnvironmentHandler_export(jp_fetch, mk_env):
    n = generate_name()
    await mk_env(n)
    r = await jp_fetch(
        NS, "environments", n, params={"download": 1, "history": 0}, method="GET"
    )
    assert r.code == 200

    content = r.body.decode("utf-8")
    assert "name: " + n in content
    assert "channels:" in content
    assert "dependencies:" in content
    assert re.search(r"- python=\d\.\d+\.\d+=\w+", content) is not None
    assert "prefix:" in content


async def test_EnvironmentHandler_export_history(jp_fetch, mk_env):
    n = generate_name()
    await mk_env(n)
    r = await jp_fetch(
        NS, "environments", n, params={"download": 1, "history": 1}, method="GET"
    )
    assert r.code == 200

    content = " ".join(r.body.decode("utf-8").splitlines())
    assert (
        re.search(
            r"^name:\s"
            + n
            + r"\s+channels:(\s+- conda-forge)?\s+- defaults\s+dependencies:\s+- python\s+prefix:",
            content,
        )
        is not None
    )


async def test_EnvironmentHandler_export_not_supporting_history(jp_fetch, mk_env):
    try:
        n = generate_name()
        await mk_env(n)
        EnvManager._conda_version = (4, 6, 0)
        r = await jp_fetch(
            NS, "environments", n, params={"download": 1, "history": 1}, method="GET"
        )
        assert r.code == 200

        content = r.body.decode("utf-8")
        assert "name: " + n in content
        assert "channels:" in content
        assert "dependencies:" in content
        assert re.search(r"- python=\d\.\d+\.\d+=\w+", content)
        assert "prefix:" in content
    finally:
        EnvManager._conda_version = None


async def test_conda_version(jp_fetch):
    EnvManager._conda_version = None
    assert EnvManager._conda_version is None
    await jp_fetch(NS, "environments", method="GET")
    assert EnvManager._conda_version is not None


async def test_PackagesEnvironmentHandler_install_and_remove(
    jp_fetch, mk_env, wait_for_task
):
    n = generate_name()
    await mk_env(n)

    r = await wait_for_task(
        NS,
        "environments",
        n,
        "packages",
        body=json.dumps({"packages": [PKG_NAME]}),
        method="POST",
    )
    assert r.code == 200
    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body)["packages"]
    v = None
    for p in pkgs:
        if p["name"] == PKG_NAME:
            v = p
            break
    assert v is not None

    r = await wait_for_task(
        NS,
        "environments",
        n,
        "packages",
        body=json.dumps({"packages": [PKG_NAME]}),
        method="DELETE",
        allow_nonstandard_methods=True,
    )
    assert r.code == 200
    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body)["packages"]
    v = None
    for p in pkgs:
        if p["name"] == PKG_NAME:
            v = p
            break
    assert v is None


async def test_PackagesEnvironmentHandler_install_with_version_constraints_1(
    jp_fetch, mk_env, wait_for_task
):
    test_pkg = "alabaster"
    n = generate_name()
    await mk_env(n)

    r = await wait_for_task(
        NS,
        "environments",
        n,
        "packages",
        body=json.dumps({"packages": [test_pkg + "==0.7.12"]}),
        method="POST",
    )
    assert r.code == 200
    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body)["packages"]
    v = None
    for p in pkgs:
        if p["name"] == test_pkg:
            v = p
            break
    assert v["version"] == "0.7.12"


async def test_PackagesEnvironmentHandler_install_with_version_constraints_2(
    jp_fetch, mk_env, wait_for_task
):
    test_pkg = "alabaster"
    n = generate_name()
    await mk_env(n)
    r = await wait_for_task(
        NS,
        "environments",
        n,
        "packages",
        body=json.dumps({"packages": [test_pkg + ">=0.7.10"]}),
        method="POST",
    )
    assert r.code == 200
    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body)["packages"]
    v = None
    for p in pkgs:
        if p["name"] == test_pkg:
            v = tuple(map(int, p["version"].split(".")))
            break
    assert v >= (0, 7, 10)


async def test_PackagesEnvironmentHandler_install_with_version_constraints_3(
    jp_fetch, mk_env, wait_for_task
):
    test_pkg = "alabaster"
    n = generate_name()
    await mk_env(n)
    r = await wait_for_task(
        NS,
        "environments",
        n,
        "packages",
        body=json.dumps({"packages": [test_pkg + ">=0.7.10,<0.7.13"]}),
        method="POST",
    )
    assert r.code == 200
    r = await jp_fetch(NS, "environments", n, method="GET")
    pkgs = json.loads(r.body)["packages"]
    v = None
    for p in pkgs:
        if p["name"] == test_pkg:
            v = tuple(map(int, p["version"].split(".")))
            break
    assert v >= (0, 7, 10)
    assert v < (0, 7, 13)


async def test_PackagesEnvironmentHandler_install_development_mode(
    jp_fetch, mk_env, wait_for_task
):
    n = generate_name()
    await mk_env(n)

    pkg_name = "banana"
    with tempfile.TemporaryDirectory() as folder:
        folder = Path(folder)
        (folder / pkg_name).mkdir(parents=True)
        (folder / pkg_name / "__init__.py").write_text("")
        (folder / "setup.py").write_text(
            f"from setuptools import setup\nsetup(name='{pkg_name}')\n"
        )

        await wait_for_task(
            NS,
            "environments",
            n,
            "packages",
            body=json.dumps({"packages": [str(folder)]}),
            params={"develop": 1},
            method="POST",
        )

        r = await jp_fetch(NS, "environments", n, method="GET")
        body = json.loads(r.body)

        v = None
        for p in body["packages"]:
            if p["name"] == pkg_name:
                v = p
                break
        assert v["channel"] == "<develop>"
        assert v["platform"] == "pypi"


async def test_PackagesEnvironmentHandler_install_development_mode_url_path(
    jp_fetch, jp_root_dir, wait_for_task, mk_env
):
    n = generate_name()
    await mk_env(n)

    pkg_name = generate_name()[1:]
    folder = jp_root_dir / pkg_name
    (folder / pkg_name).mkdir(parents=True)
    (folder / pkg_name / "__init__.py").write_text("")
    (folder / "setup.py").write_text(
        f"from setuptools import setup\nsetup(name='{pkg_name}')\n"
    )

    await wait_for_task(
        NS,
        "environments",
        n,
        "packages",
        body=json.dumps({"packages": [pkg_name]}),
        params={"develop": 1},
        method="POST",
    )

    r = await jp_fetch(NS, "environments", n, method="GET")
    body = json.loads(r.body)

    v = None
    for p in body["packages"]:
        if p["name"] == pkg_name:
            v = p
            break
    assert v["channel"] == "<develop>"
    assert v["platform"] == "pypi"


async def test_PackagesEnvironmentHandler_update(wait_for_task, mk_env):
    n = generate_name()
    await mk_env(n)

    r = await wait_for_task(
        NS,
        "environments",
        n,
        "packages",
        method="PATCH",
        allow_nonstandard_methods=True,
    )
    assert r.code == 200


async def test_PackagesHandler_search(wait_for_task):
    r = await wait_for_task(NS, "packages", params={"query": PKG_NAME}, method="GET")
    assert r.code == 200
    body = json.loads(r.body)
    assert "packages" in body
    v = None
    for p in body["packages"]:
        if p["name"] == PKG_NAME:
            v = p
            break
    assert v is not None


async def test_PackagesHandler_list_available(wait_for_task):
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

            rvalue = [
                (0, json.dumps(dummy)),
                (0, json.dumps(channels)),
            ]
            # Use side_effect to have a different return value for each call
            f.side_effect = map(maybe_future, rvalue)

            r = await wait_for_task(NS, "packages", method="GET")
            assert r.code == 200
            body = json.loads(r.body)

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
            assert body == expected


@pytest.mark.skipif(
    sys.platform.startswith("win"), reason="TODO test not enough reliability"
)
async def test_PackagesHandler_list_available_local_channel(wait_for_task):
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

            with tempfile.TemporaryDirectory() as local_channel:
                (Path(local_channel) / "channeldata.json").write_text(
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
                f.side_effect = map(maybe_future, rvalue)

                r = await wait_for_task(NS, "packages", method="GET")
                assert r.code == 200
                body = json.loads(r.body)

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
                assert body == expected


@pytest.mark.skipif(sys.platform.startswith("win"), reason="not reliable on Windows")
async def test_PackagesHandler_list_available_no_description(wait_for_task):
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
                f.side_effect = map(maybe_future, rvalue)

                r = await wait_for_task(NS, "packages", method="GET")
                assert r.code == 200
                body = json.loads(r.body)

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
                assert body == expected


async def test_PackagesHandler_list_available_caching(wait_for_task, jp_fetch):
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

            rvalue = [
                (0, json.dumps(dummy)),
                (0, json.dumps(channels)),
            ]
            # Use side_effect to have a different return value for each call
            f.side_effect = map(maybe_future, rvalue)

            # First retrival no cache available
            r = await wait_for_task(NS, "packages", method="GET")
            assert r.code == 200

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
            assert os.path.exists(cache_file) == True

            with open(cache_file) as cache:
                assert json.load(cache) == expected

            # Retrieve using cache
            r = await jp_fetch(NS, "packages", method="GET")
            assert r.code == 200
            body = json.loads(r.body)
            assert body == expected


async def test_TaskHandler_get_invalid_task(jp_fetch):
    with assert_http_error(404):
        await jp_fetch(NS, "tasks", str(random.randint(1, 1200)), method="GET")


async def test_TaskHandler_delete_invalid_task(jp_fetch):
    with assert_http_error(404):
        await jp_fetch(NS, "tasks", str(random.randint(1, 1200)), method="DELETE")


async def test_TaskHandler_delete_task(jp_fetch, rm_env):
    n = generate_name()
    r = await jp_fetch(
        NS,
        "environments",
        body=json.dumps({"name": n, "packages": ["python"]}),
        method="POST",
    )
    try:
        location = r.headers["Location"]
        _, index = location.rsplit("/", maxsplit=1)
        r = await jp_fetch(NS, "tasks", index, method="DELETE")
        assert r.code == 204
    finally:
        await rm_env(n)

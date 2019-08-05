import unittest
import uuid

from jupyter_conda.tests.utils import (
    APITester,
    ServerTest,
    assert_http_error,
    url_path_join,
)


def generate_name() -> str:
    return "_" + uuid.uuid4().hex


class JupyterCondaAPITest(ServerTest):
    def setUp(self):
        super(JupyterCondaAPITest, self).setUp()
        self.env_names = []
        self.pkg_name = "alabaster"

    def tearDown(self):
        for n in self.env_names:
            self.wait_for_task(self.rm_env, n)
        super(JupyterCondaAPITest, self).tearDown()

    def wait_for_task(self, call, *args):
        r = call(*args)
        location = r.headers["Location"]
        self.assertEqual(r.status_code, 202)
        self.assertRegex(location, r"tasks/\d+")
        return self.wait_task(location)

    def mk_env(self, name=None):
        envs = self.conda_api.envs()
        env_names = map(lambda env: env["name"], envs["environments"])
        new_name = name or generate_name()
        if new_name in env_names:
            self.wait_for_task(self.rm_env)
        self.env_names.append(new_name)

        return self.conda_api.post(
            ["environments", new_name, "create"], params={"type": "python2"}
        )

    def rm_env(self, name):
        return self.conda_api.post(["environments", name, "delete"])

    def cp_env(self, name, new_name):
        self.env_names.append(new_name)
        return self.conda_api.post(
            ["environments", name, "clone"], body={"name": new_name}
        )

    def test_env_create_and_destroy(self):
        # Creating an existing environment does not induce error
        n = generate_name()
        response = self.wait_for_task(self.mk_env, n)
        self.assertEqual(response.status_code, 200)

        response = self.wait_for_task(self.rm_env, n)
        self.assertEqual(response.status_code, 200)

        response = self.wait_for_task(self.mk_env, n)
        self.assertEqual(response.status_code, 200)

        response = self.wait_for_task(self.rm_env, n)
        self.assertEqual(response.status_code, 200)

    def test_root(self):
        self.wait_for_task(self.mk_env, generate_name())
        envs = self.conda_api.envs()
        root = filter(lambda env: env["name"] == "base", envs["environments"])
        self.assertEqual(len(list(root)), 1)

    def test_env_clone(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        response = self.wait_for_task(self.cp_env, n, n + "-copy")
        self.assertEqual(response.status_code, 200)

        response = self.wait_for_task(self.rm_env, n + "-copy")
        self.assertEqual(response.status_code, 200)
        self.wait_for_task(self.rm_env, n)

    def test_env_nonsense(self):
        n = generate_name()
        with assert_http_error(404):
            self.conda_api.post(["environments", n, "nonsense"])

    def test_env_export(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        r = self.conda_api.get(["environments", n, "export"])
        self.assertEqual(r.status_code, 200)

    def test_pkg_install_and_remove(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        def f():
            return self.conda_api.post(
            ["environments", n, "packages", "install"],
            body={"packages[]": self.pkg_name},
        )
        r = self.wait_for_task(f)
        self.assertEqual(r.status_code, 200)

        def g():
            return self.conda_api.post(
                ["environments", n, "packages", "remove"],
                body={"packages[]": self.pkg_name},
            )
        r = self.wait_for_task(g)
        self.assertEqual(r.status_code, 200)

    def test_pkg_update(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)

        r = self.wait_for_task(self.conda_api.post, ["environments", n, "packages", "check"])
        self.assertEqual(r.status_code, 200)

    def test_pkg_check(self):
        n = generate_name()
        self.wait_for_task(self.mk_env, n)
        
        r = self.wait_for_task(self.conda_api.post, ["environments", n, "packages", "update"])
        self.assertEqual(r.status_code, 200)

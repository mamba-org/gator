import unittest

from jupyter_conda.tests.utils import APITester, ServerTest, assert_http_error, url_path_join


class JupyterCondaAPITest(ServerTest):

    def setUp(self):
        super(JupyterCondaAPITest, self).setUp()
        self.env_name = "_DELETE_ME_"
        self.pkg_name = "alabaster"
        self.wait_for_task(self.mk_env)

    def tearDown(self):
        self.wait_for_task(self.rm_env)
        self.wait_for_task(self.rm_env, self.env_name + "-copy")
        super(JupyterCondaAPITest, self).tearDown()

    def wait_for_task(self, call, *args):
        r = call(*args)
        location = r.headers["Location"]
        self.assertEqual(r.status_code, 202)
        self.assertRegex(location, r"tasks/\d+")
        return self.wait_task(location)

    def test_root(self):
        envs = self.conda_api.envs()
        root = filter(lambda env: env["name"] == "base", envs["environments"])
        self.assertEqual(len(list(root)), 1)

    def mk_env(self, name=None):
        envs = self.conda_api.envs()
        env_names = map(lambda env: env['name'], envs["environments"])
        if self.env_name in env_names:
            self.rm_env()

        return self.conda_api.post(
            ["environments", name or self.env_name, "create"],
            params={"type": "python2"},
        )

    def rm_env(self, name=None):
        return self.conda_api.post(["environments", name or self.env_name, "delete"])

    def cp_env(self, name=None, new_name=None):
        if name is None:
            name = self.env_name
        return self.conda_api.post(
            ["environments", name, "clone"], body={"name": new_name}
        )

    def test_env_create_and_destroy(self):
        # Creating an existing environment does not induce error
        response = self.wait_for_task(self.mk_env)
        self.assertEqual(response.status_code, 200)

        response = self.wait_for_task(self.rm_env)
        self.assertEqual(response.status_code, 200)

        response = self.wait_for_task(self.mk_env)
        self.assertEqual(response.status_code, 200)

        response = self.wait_for_task(self.rm_env)
        self.assertEqual(response.status_code, 200)

    def test_env_clone(self):
        response = self.wait_for_task(self.cp_env)
        self.assertEqual(response.status_code, 200)
        
        
        response = self.wait_for_task(self.rm_env, self.env_name + "-copy")
        self.assertEqual(response.status_code, 200)
        self.wait_for_task(self.rm_env)

    def test_env_nonsense(self):
        with assert_http_error(404):
            self.conda_api.post(["environments", self.env_name, "nonsense"])

    def test_env_export(self):
        r = self.conda_api.get(["environments", self.env_name, "export"])
        self.assertEqual(r.status_code, 200)

    def test_pkg_install_and_remove(self):
        r = self.conda_api.post(
            ["environments", self.env_name, "packages", "install"],
            body={"packages[]": self.pkg_name},
        )
        self.assertEqual(r.status_code, 200)
        r = self.conda_api.post(
            ["environments", self.env_name, "packages", "remove"],
            body={"packages[]": self.pkg_name},
        )
        self.assertEqual(r.status_code, 200)

    def test_pkg_update(self):
        r = self.conda_api.post(["environments", self.env_name, "packages", "check"])
        self.assertEqual(r.status_code, 200)

    def test_pkg_check(self):
        r = self.conda_api.post(["environments", self.env_name, "packages", "update"])
        self.assertEqual(r.status_code, 200)

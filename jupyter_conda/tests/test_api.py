import unittest
from traitlets.config import Config
from jupyter_conda.tests.utils import APITester, ServerTestBase, assert_http_error, url_path_join


class JupyterCondaAPI(APITester):
    """Wrapper for nbconvert API calls."""

    url = "conda"

    def get(self, path, body=None, params=None):
        return self._req("GET", path, body, params)

    def post(self, path, body=None, params=None):
        return self._req("POST", path, body, params)

    def envs(self):
        return self.get(["environments"]).json()


class JupyterCondaAPITest(ServerTestBase):
    # Force extension enabling - Disabled by parent class otherwise
    config = Config({"NotebookApp": {"nbserver_extensions": {"jupyter_conda": True}}})

    def setUp(self):
        super(JupyterCondaAPITest, self).setUp()
        self.conda_api = JupyterCondaAPI(self.request)
        self.env_name = "_DELETE_ME_"
        self.pkg_name = "alabaster"
        self.mk_env()

    def tearDown(self):
        self.rm_env()
        self.rm_env(self.env_name + "-copy")
        super(JupyterCondaAPITest, self).tearDown()

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
        self.assertEqual(self.mk_env().status_code, 201)
        self.assertEqual(self.rm_env().status_code, 200)
        self.assertEqual(self.mk_env().status_code, 201)
        self.assertEqual(self.rm_env().status_code, 200)

    def test_env_clone(self):
        self.assertEqual(self.cp_env().status_code, 201)
        self.assertEqual(self.rm_env(self.env_name + "-copy").status_code, 200)
        self.rm_env()

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

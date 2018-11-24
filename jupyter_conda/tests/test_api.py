import requests
import unittest
from notebook.utils import url_path_join
from notebook.tests.launchnotebook import NotebookTestBase


class NbCondaAPI(object):
    """Wrapper for nbconvert API calls."""
    def __init__(self, base_url):
        self.base_url = base_url

    def _req(self, verb, path, body=None, params=None):
        response = requests.request(
            verb,
            url_path_join(self.base_url, 'conda', *path),
            data=body, params=params,
        )
        return response

    def get(self, path, body=None, params=None):
        return self._req('GET', path, body, params)

    def post(self, path, body=None, params=None):
        return self._req('POST', path, body, params)

    def envs(self):
        return self.get(["environments"]).json()


class NbCondaAPITest(NotebookTestBase):
    def setUp(self):
        super(NbCondaAPITest, self).setUp()
        self.conda_api = NbCondaAPI(self.base_url())
        self.env_name = "_DELETE_ME_"
        self.pkg_name = "alabaster"
        self.mk_env()

    def tearDown(self):
        self.rm_env()
        self.rm_env(self.env_name + '-copy')
        super(NbCondaAPITest, self).tearDown()

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_root(self):
        envs = self.conda_api.envs()
        root = filter(lambda env: env["name"] == "root",
                      envs["environments"])
        self.assertEqual(len(list(root)), 1)

    def mk_env(self, name=None):
        return self.conda_api.post(["environments", name or self.env_name,
                                   "create"], params={"type": "python2"})

    def rm_env(self, name=None):
        return self.conda_api.post(["environments", name or self.env_name,
                                   "delete"])

    def cp_env(self, name=None, new_name=None):
        if name is None:
            name = self.env_name
        return self.conda_api.post(["environments", name, "clone"],
                                   body={"name": new_name})

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_env_create_and_destroy(self):
        self.assertEqual(self.mk_env().status_code, 400)
        self.assertEqual(self.rm_env().status_code, 200)
        self.assertEqual(self.mk_env().status_code, 201)
        self.assertEqual(self.rm_env().status_code, 200)

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_env_clone(self):
        self.assertEqual(self.cp_env().status_code, 201)
        self.assertEqual(self.rm_env(self.env_name + "-copy").status_code, 200)
        self.rm_env()

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_env_nonsense(self):
        r = self.conda_api.post(["environments", self.env_name, "nonsense"])
        self.assertEqual(r.status_code, 404)

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_env_export(self):
        r = self.conda_api.get(["environments", self.env_name, "export"])
        self.assertEqual(r.status_code, 200)

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_pkg_install_and_remove(self):
        r = self.conda_api.post(["environments", self.env_name, "packages",
                                 "install"],
                                body={"packages[]": self.pkg_name})
        self.assertEqual(r.status_code, 200)
        r = self.conda_api.post(["environments", self.env_name, "packages",
                                 "remove"], body={"packages[]": self.pkg_name})
        self.assertEqual(r.status_code, 200)

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_pkg_update(self):
        r = self.conda_api.post(["environments", self.env_name, "packages",
                                 "check"])
        self.assertEqual(r.status_code, 200)

    @unittest.skip("skipping for now because parent class disable extensions")
    def test_pkg_check(self):
        r = self.conda_api.post(["environments", self.env_name, "packages",
                                 "update"])
        self.assertEqual(r.status_code, 200)

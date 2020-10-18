import os
import glob
import subprocess

from unittest.mock import patch

from notebook import jstest

import platform

IS_WIN = "Windows" in platform.system()

here = os.path.dirname(__file__)

# global npm installs are bad, add the local node_modules to the path
os.environ["PATH"] = os.pathsep.join([
    os.environ["PATH"],
    os.path.abspath(os.path.join(here, "node_modules", ".bin"))
])

TEST_LOG = ".jupyter.jstest.log"


class NBCondaTestController(jstest.JSController):
    """ Javascript test subclass that installs widget nbextension in test
        environment
    """
    def __init__(self, section, *args, **kwargs):
        super(NBCondaTestController, self).__init__(section, *args, **kwargs)

        test_cases = glob.glob(os.path.join(here, 'js', 'test_notebook_*.js'))
        js_test_dir = jstest.get_js_test_dir()

        includes = [
            os.path.join(js_test_dir, 'util.js')
        ] + glob.glob(os.path.join(here, 'js', '_*.js'))

        self.cmd = [
            'casperjs', 'test',
            '--includes={}'.format(",".join(includes)),
            '--engine={}'.format(self.engine)
        ] + test_cases        
        
        if IS_WIN:
            self.cmd[0] = "{}.cmd".format(self.cmd[0])


def prepare_controllers(options):
    """Monkeypatched prepare_controllers for running widget js tests

    instead of notebook js tests
    """
    if options.testgroups:
        groups = options.testgroups
    else:
        groups = ['']
    return [NBCondaTestController(g, xunit=True) for g in groups], []


def test_notebook():
    with patch.object(jstest, 'prepare_controllers', prepare_controllers):
        jstest.main()


if __name__ == '__main__':
    test_notebook()

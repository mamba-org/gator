from nbsetuptools import setup, find_static
from os.path import abspath, dirname, join

setup(
    name="condaenvs",
    version="0.1.0",
    static=join(abspath(dirname(__file__)), 'nbextension', 'static')
)

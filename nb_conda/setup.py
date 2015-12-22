from nbsetuptools import setup, find_static
from os.path import abspath, dirname, join

setup(
    name="nb_conda",
    version="0.1.1",
    static=join(abspath(dirname(__file__)), 'nbextension', 'static')
)

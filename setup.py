import setuptools
from os.path import join

# should be loaded below
__version__ = None

with open(join('nb_conda', '_version.py')) as version:
    exec(version.read())

setuptools.setup(
    name="nb_conda",
    version=__version__,
    url="https://github.com/Anaconda-Platform/nb_conda_kernels",
    author="Continuum Analytics",
    description="Manage your conda environments from the Jupyter Notebook",
    long_description=open('README.md').read(),
    packages=setuptools.find_packages(),
    include_package_data=True,
    zip_safe=False
)

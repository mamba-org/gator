import setuptools
import os

# should be loaded below
__version__ = None

with open(os.path.join("jupyter_conda", "_version.py")) as version:
    exec(version.read())

static_folder = "jupyter_conda/static"

long_description = ""
with open("README.md") as rd:
    long_description = rd.read()

setuptools.setup(
    name="jupyter_conda",
    version=__version__,
    url="https://github.com/fcollonval/jupyter_conda",
    author="Continuum Analytics, Frederic Collonval",
    description="Manage your conda environments from the Jupyter Notebook and JupyterLab",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages(),
    include_package_data=True,
    data_files=[
        # like `jupyter nbextension install --sys-prefix`
        (
            "share/jupyter/nbextensions/jupyter_conda",
            [
                os.path.join(static_folder, a_file)
                for a_file in os.listdir(static_folder)
            ],
        ),
        # like `jupyter nbextension enable --sys-prefix`
        (
            "etc/jupyter/nbconfig/notebook.d",
            ["jupyter-config/nbconfig/notebook.d/jupyter_conda.json"],
        ),
        (
            "etc/jupyter/nbconfig/tree.d",
            ["jupyter-config/nbconfig/tree.d/jupyter_conda.json"],
        ),
        # like `jupyter serverextension enable --sys-prefix`
        (
            "etc/jupyter/jupyter_notebook_config.d",
            ["jupyter-config/jupyter_notebook_config.d/jupyter_conda.json"],
        ),
    ],
    zip_safe=False,
    install_requires=[
        # "conda>=4.5",  # Required conda not available through PyPi anymore
        "nb_conda_kernels>=2.2.0",
        "notebook>=4.3.1",
        "packaging",
        "typing;python_version<'3.7'",
    ],
    extras_require={
        "test": ["coverage", "flake8", "pytest", "pytest-asyncio", "requests"]
    },
)

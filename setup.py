import setuptools
import os

# should be loaded below
__version__ = None

with open(os.path.join("mamba_gator", "_version.py")) as version:
    exec(version.read())

classic_folder = "mamba_gator/navigator"
lab_folder = "mamba_gator/labextension"

if not os.path.exists(lab_folder):
    os.mkdir(lab_folder)

long_description = ""
with open("README.md") as rd:
    long_description = rd.read()

setuptools.setup(
    name="mamba_gator",
    version=__version__,
    url="https://github.com/mamba-org/mamba_gator",
    author="Continuum Analytics, Jupyter Development Team",
    description="Manage your conda environments from the Jupyter Notebook and JupyterLab",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages(),
    include_package_data=True,
    data_files=[
        # like `jupyter nbextension install --sys-prefix`
        (
            "share/jupyter/nbextensions/mamba_gator",
            [
                os.path.join(classic_folder, a_file)
                for a_file in os.listdir(classic_folder)
                if os.path.isfile(os.path.join(classic_folder, a_file)) and not a_file.endswith(".py")
            ],
        ),
        # like `jupyter nbextension enable --sys-prefix`
        (
            "etc/jupyter/nbconfig/notebook.d",
            ["jupyter-config/nbconfig/notebook.d/mamba_gator.json"],
        ),
        (
            "etc/jupyter/nbconfig/tree.d",
            ["jupyter-config/nbconfig/tree.d/mamba_gator.json"],
        ),
        (
            "share/jupyter/lab/extensions",
            [
                os.path.join(lab_folder, a_file)
                for a_file in os.listdir(lab_folder)
                if a_file.endswith(".tgz")
            ],
        ),
        # like `jupyter serverextension enable --sys-prefix`
        (
            "etc/jupyter/jupyter_notebook_config.d",
            ["jupyter-config/jupyter_notebook_config.d/mamba_gator.json"],
        ),
    ],
    zip_safe=False,
    install_requires=[
        # "conda>=4.5",  # Required conda not available through PyPi anymore
        "jupyterlab_server",
        "notebook>=4.3.1",
        "packaging",
        "typing;python_version<'3.7'",
    ],
    extras_require={
        "test": [
            "coverage",
            "flake8",
            "nb_conda_kernels>=2.2.0",
            "pytest",
            "pytest-asyncio",
            "requests",
        ]
    },
    entry_points={"console_scripts": ["gator = mamba_gator.navigator.main:main"]},
)

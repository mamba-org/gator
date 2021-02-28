import os

from jupyter_packaging import (
    create_cmdclass, install_npm, ensure_targets,
    combine_commands, get_version,
)
import setuptools

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name="mamba_gator"

# should be loaded below
__version__ = None

with open(os.path.join("mamba_gator", "_version.py")) as version:
    exec(version.read())

lab_path = os.path.join(HERE, "mamba_gator", "labextension")
labextension_path = os.path.join(HERE, "packages", "labextension")

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(labextension_path, "lib", "index.js"),
    os.path.join(lab_path, "package.json"),
]

package_data_spec = {
    name: [
        "*"
    ]
}

labext_name = "@mamba-org/gator-lab"

data_files_spec = [
    # like `jupyter server extension enable --sys-prefix`
    (
        "etc/jupyter/jupyter_server_config.d",
        "jupyter-config/jupyter_server_config.d",
        "mamba_gator.json",
    ),
    (
        "etc/jupyter/jupyter_notebook_config.d",
        "jupyter-config/jupyter_notebook_config.d",
        "mamba_gator.json",
    ),
    ("share/jupyter/labextensions/%s" % labext_name, lab_path, "**"),
    ("share/jupyter/labextensions/%s" % labext_name, HERE, "install.json"),
]

cmdclass = create_cmdclass("jsdeps",
    package_data_spec=package_data_spec,
    data_files_spec=data_files_spec
)

cmdclass["jsdeps"] = combine_commands(
    install_npm(HERE, build_cmd="build:prod", npm=["jlpm"]),
    ensure_targets(jstargets),
)

long_description = ""
with open("README.md") as rd:
    long_description = rd.read()

setuptools.setup(
    name="mamba_gator",
    version=__version__,
    url="https://github.com/mamba-org/gator",
    author="Continuum Analytics, Jupyter Development Team",
    description="Manage your conda environments from the Jupyter Notebook and JupyterLab",
    long_description=long_description,
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        # "conda>=4.5",  # Required conda not available through PyPi anymore
        "jupyter_client",
        "jupyterlab_server",
        "packaging",
        "tornado",
        "traitlets",
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

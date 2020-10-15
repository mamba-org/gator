import os

from jupyter_packaging import (
    create_cmdclass,
    install_npm,
    ensure_targets,
    combine_commands,
    get_version,
)
import setuptools

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name = "jupyter_conda"

# Get our version
version = get_version(os.path.join(name, "_version.py"))

nb_path = os.path.join(HERE, name, "static")
lab_path = os.path.join(HERE, name, "labextension")

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(lab_path, "lib", "index.js"),
    os.path.join(HERE, name, "labextension", "package.json"),
]

package_data_spec = {name: ["*"]}

labext_name = "jupyter_conda"

data_files_spec = [
    ("share/jupyter/labextensions/%s" % labext_name, lab_path, "*.*"),
    (
        "share/jupyter/nbextensions/jupyter_conda",
        [os.path.join(nb_path, a_file) for a_file in os.listdir(nb_path)],
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
]

cmdclass = create_cmdclass(
    "jsdeps", package_data_spec=package_data_spec, data_files_spec=data_files_spec
)

cmdclass["jsdeps"] = combine_commands(
    install_npm(lab_path, build_cmd="build", npm=["jlpm"]), ensure_targets(jstargets),
)

with open("README.md", "r") as fh:
    long_description = fh.read()

setup_args = dict(
    name=name,
    version=version,
    url="https://github.com/mamba-org/jupyter_conda",
    author="Continuum Analytics, Frederic Collonval",
    description="Manage your conda environments from the Jupyter Notebook and JupyterLab",
    long_description=long_description,
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    zip_safe=False,
    include_package_data=True,
    python_requires=">=3.6",
    install_requires=[
        # "conda>=4.5",  # Required conda not available through PyPi anymore
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
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab", "Conda", "Mamba"],
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Framework :: Jupyter",
    ],
)

if __name__ == "__main__":
    setuptools.setup(**setup_args)

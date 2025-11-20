# Gator

The Mamba Navigator, a Web UI for managing conda environments

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/mamba-org/gator/master?urlpath=lab)
[![Install with conda](https://anaconda.org/conda-forge/mamba_gator/badges/installer/conda.svg)](https://anaconda.org/conda-forge/mamba_gator)
[![npm](https://img.shields.io/npm/v/@mamba-org/gator-lab.svg?style=flat-square)](https://www.npmjs.com/package/@mamba-org/gator-lab)
[![Github Actions Status](https://github.com/mamba-org/gator/workflows/Test/badge.svg)](https://github.com/mamba-org/gator/actions?query=workflow%3ATest)
[![Swagger Validator](https://img.shields.io/swagger/valid/3.0?specUrl=https%3A%2F%2Fraw.githubusercontent.com%2Fmamba-org%2Fgator%2Fmaster%2Fmamba_gator%2Frest_api.yml)](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/mamba-org/gator/master/mamba_gator/rest_api.yml)

Provides Conda/Mamba environment and package management as a [standalone application](#Navigator) or as extension for [JupyterLab](#JupyterLab).

## Install

_Requirements_

- conda >= 4.5 or mamba 1.x 
- JupyterLab 4.0.x (for the JupyterLab extension only)

> Starting from 3.4, this extension will use [mamba](https://github.com/mamba-org/mamba) instead of `conda` if it finds it.

To install in the classical notebook:

```shell
mamba install -c conda-forge mamba_gator
```

To install in the JupyterLab:

```shell
mamba install -c conda-forge jupyterlab mamba_gator
```

> Optionally, you could install [`jupyterlab-tour`](https://github.com/fcollonval/jupyterlab-tour) to
> add a help tour for the conda packages manager.

## JupyterLab

This extension adds a new entry _Conda Packages Manager_ in the _Settings_ menu.

> The first time, it can take quite some time to build the available packages list. But once it is obtained,
> it will be cached and updated to the background to have a smoother user experience.

![jupyterlab_conda_extension](packages/labextension/jupyterlab_conda.gif)

## _Gator_ (Mamba navigator)

This project contains a standalone navigator application sharing much of the code
of the JupyterLab extension.

## Classical Jupyter Notebook

The classical Jupyter Notebook is supported only for version prior to 5. But you can
directly manage the conda environments with the standalone navigator tool. For that
you need to execute the following command in a terminal:

```
gator
```

## Creating New Environments

There are three ways to create an environment:

- Create a new environment
  Use the New Environment button at the top of the page, and select `Python 3`, or `R` to create a
  base environment with the corresponding packages. Note that if you want to run a
  Jupyter python kernel in the new environment, you must also install the `ipykernel`
  package in the environment.

- Clone an existing environment
  Click the clone button next to an environment in the list, and enter the desired name of the
  new environment.

- Import an exported environment from a YAML file

### Try it online

Open _Gator_ (Mamba Navigator): [![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/mamba-org/gator/master?urlpath=mamba/gator)

Open JupyterLab: [![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/mamba-org/gator/master?urlpath=lab)

![lab-launcher](packages/navigator/navigator_as_service.png)

## Development

To setup a development environment follow our [Contributing Guide](CONTRIBUTING.md).

If you would like to try a pre-release version:

```shell
conda create -c conda-forge -y -n gator python=3.13 nodejs jupyterlab=4.0 
conda activate gator
pip install git+https://github.com/mamba-org/gator.git
jupyter lab
```

## Acknowledgements

This work started as a fork by [@fcollonval](https://github.com/fcollonval/) of the Anaconda [nb_conda package](https://github.com/Anaconda-Platform/nb_conda) to add
JupyterLab support.

Then with the [mamba initiative](https://medium.com/@QuantStack/open-software-packaging-for-science-61cecee7fc23) pushed by QuantStack it made
sense to move the project in the `mamba-org` organization.

## Changelog

## Changelog

- [Changelog file](docs/source/changelog.md) (in this repository)
- [Rendered documentation](https://mamba-gator.readthedocs.io/en/latest/changelog.html)
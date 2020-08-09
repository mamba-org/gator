# jupyter_conda

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/fcollonval/jupyter_conda/master?urlpath=lab)
[![Install with conda](https://anaconda.org/conda-forge/jupyter_conda/badges/installer/conda.svg)](https://anaconda.org/conda-forge/jupyter_conda)
[![npm](https://img.shields.io/npm/v/jupyterlab_conda.svg?style=flat-square)](https://www.npmjs.com/package/jupyterlab_conda)
[![Github Actions Status](https://github.com/fcollonval/jupyter_conda/workflows/Test/badge.svg)](https://github.com/fcollonval/jupyter_conda/actions?query=workflow%3ATest)
[![Coverage Status](https://coveralls.io/repos/github/fcollonval/jupyter_conda/badge.svg?branch=master)](https://coveralls.io/github/fcollonval/jupyter_conda?branch=master)
[![Swagger Validator](https://img.shields.io/swagger/valid/3.0?specUrl=https%3A%2F%2Fraw.githubusercontent.com%2Ffcollonval%2Fjupyter_conda%2Fmaster%2Fjupyter_conda%2Frest_api.yml)](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/fcollonval/jupyter_conda/master/jupyter_conda/rest_api.yml)

Provides Conda environment and package access extension from within Jupyter Notebook and JupyterLab.

This is a fork of the Anaconda [nb_conda package](https://github.com/Anaconda-Platform/nb_conda). The decision to fork it came due
to apparently dead status of the previous package and a need to integrate it within JupyterLab.

## Install

_Requirements_

- conda >= 4.5
- notebook >= 4.3
- JupyterLab 1.x or 2.x (for the jupyterlab extension only)

> Starting from 3.4, this extension will use [mamba](https://github.com/TheSnakePit/mamba) instead of `conda` if it finds it.

To install in the classical notebook:

```shell
conda install -c conda-forge jupyter_conda
```

To install in the JupyterLab:

```shell
conda install -c conda-forge jupyterlab jupyter_conda
jupyter labextension install jupyterlab_conda
```

> Optionally, you could install [`jupyterlab-tour`](https://github.com/fcollonval/jupyterlab-tour) to
> add a help tour for the conda packages manager.

## Classical Jupyter Notebook

### Conda tab in the Jupyter file browser

This extensions adds a Conda tab to the Jupyter file browser. Selecting the Conda tab
will display:

- A list of the Conda environments that current exist
- The list of Conda packages available in currently configured channels
  (http://conda.pydata.org/docs/config.html#channel-locations-channels)
- The list of packages installed in the selected environment.

You can click on the name of an environment to select it. That will allow you to:

- see the packages installed in the environment
- install new packages from the available package list
- check for updates on selected (or all) packages
- update selected (or all) packages in the environment.

### Conda in the Notebook view

This extension adds a Conda Packages item to the Kernel menu. Selecting this item displays
the list of Conda packages in the environment associated with the running kernel, and the
list of available packages. You can perform the same actions as in the Conda tab, but only
against the current environment.

## JupyterLab

This extension add a new entry _Conda Packages Manager_ in the _Settings_ menu.

> The first time, it can take quite some time to build the available packages list. But once it is obtained,
> it will be cached and updated to the background to have a smoother user experience.

![jupyterlab_conda_extension](labextension/jupyterlab_conda.gif)

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

## Development

```shell
conda create -y -n jupyter_conda python jupyterlab~=2.1
conda install -y -n jupyter_conda --file requirements_dev.txt -c conda-forge
source activate jupyter_conda
python setup.py develop
jupyter nbextension install jupyter_conda --py --sys-prefix --symlink
jupyter nbextension enable jupyter_conda --py --sys-prefix
jupyter serverextension enable jupyter_conda --py --sys-prefix

cd labextension
jupyter labextension install .
```

## Changelog

### 3.4.0

- Features
  - Use `mamba` if available. Otherwise use `conda` [#48](https://github.com/fcollonval/jupyter_conda/issues/48)
  - Move to GitHub workflow (extend coverage to JupyterLab code)
- Bugs
  - Fix wrong redirection url in classic notebook [#46](https://github.com/fcollonval/jupyter_conda/issues/46)
  - Fix channel given by full URL not properly handle [#55](https://github.com/fcollonval/jupyter_conda/issues/55)

### 3.3.1

- Bugs
  - Fix export always from history (settings ignored)

### 3.3.0

- Features
  - Add a settings `fromHistory` to export an environment using [`--from-history`](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html#exporting-an-environment-file-across-platforms) (available for conda >= 4.7.12) [#39](https://github.com/fcollonval/jupyter_conda/pull/39)
- Bugs
  - Fixes absent `channeldata.json` file [#36](https://github.com/fcollonval/jupyter_conda/issues/36)
  - Fixes environment update absent from public API [#37](https://github.com/fcollonval/jupyter_conda/pull/37)
- Documentation
  - Start REST API description with Swagger

### 3.2.0

- Available package cache file is now writable for everybody to avoid trouble in multi-user context. [#25](https://github.com/fcollonval/jupyter_conda/pull/25)
- Add update environment from file through REST endpoint PATCH /environments/ [#26](https://github.com/fcollonval/jupyter_conda/pull/26)
- Switch to newer Python syntax async-await
- To improve UI reactivity in Jupyterlab:

  - Long running task can now be cancelled #32
  - The available packages list is used to find updatable package. conda update --dry-run --all is not used any longer. But it is still used if the user request updating all possible packages.

### 3.1.0

- Request environment list accept now `whitelist`=0 or 1 query arguments. If 1, the environment
  list is filtered to respect `KernelSpecManager.whitelist`. Default is 0, but it could be modified
  in user settings.
- JupyterLab extension
  - `IEnvironmentManager.getPackageManager()` returns always the same `Conda.IPackageManager`
    otherwise signaling package operations would have been meaningless.
  - Add ability to specify kernel companions; i.e. check that if some packages are installed in a
    kernel, they must respect a certain version range. Companions can be specified through user
    settings.
  - Small UI tweaks

### 3.0.0

- Rework the server/client API to be more RESTful and returns 202 status for long operations
- Cache available packages list in temp directory
- Improve greatly the coverage for the server extension
- JupyterLab extension only:
  - Allow the user to change the proposed environment when creating one from scratch
  - Add signals to handle environnements and packages changes (see `labextension\src\__tests__\services.spec.ts`)
  - Improve the UI reactivity by using `react-virtualized` for the packages list
  - Improve the look and feel
- Available packages truncation has been removed.

### 2.5.1

- Catch SSLError when requesting `channeldata.json` file

### 2.5.0

- Export in YAML format the environment (import in the older format is still supported).
- Improve responsiveness by loading first installed packages. Then request available one.
- BUG error is prompt when an environment is deleted although everything went well
- Cache some API requests (GET environments, GET channels and GET available packages).
- Available packages are now truncated to 100.
  - Use query argument `$skip` to skip N first packages
  - If the list is longer than 100, a entry `$next` in the response is returned. This  
    is the request url to use to get the next batch of packages.
- Report full error message in web browser console to ease debugging.

### 2.4.2

- BUG environment not shown
- BUG Installing package in develop mode fails if in user home or containing spaces
- Improve error feedback from API to frontend

### 2.4.1

- BUG `conda search` crashes for conda 4.6

### 2.4.0

- Add installation of package in development mode (through `pip`)

### 2.3.x

- Add JupyterLab extension inspired by Anaconda Navigator
  - Retrieve conda package description
  - Add link to package website (if available)
- Support conda >=4.5
- Make all conda request asynchronously
- Use the automatic installation for Jupyter Notebook extension (see [here](https://jupyter-notebook.readthedocs.io/en/stable/examples/Notebook/Distributing%20Jupyter%20Extensions%20as%20Python%20Packages.html))

### 2.2.1

- fix bug in check updates feature

### 2.2.0

- support conda 4.3
- support notebook security fix introduced in notebook 4.3.1

### 2.1.0

- fix environment export button
- allow environment names with one letter and validate against "suspicious" characters

### 2.0.0

- update to new jupyter_conda_kernels naming scheme
- namespace all API calls into `/conda/`

### 1.1.0

- fix usage in root environment

### 1.0.1

- minor build changes

### 1.0.0

- Update to notebook 4.2

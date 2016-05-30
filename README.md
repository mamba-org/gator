# nb_conda
[![Install with conda](https://anaconda.org/conda-forge/nb_conda/badges/installer/conda.svg
)](https://anaconda.org/conda-forge/nb_conda)
[![Build Status](https://travis-ci.org/Anaconda-Platform/nb_conda.svg)](https://travis-ci.org/Anaconda-Platform/nb_conda) [![Build status](https://ci.appveyor.com/api/projects/status/j999v076nwgwppwm/branch/master?svg=true)](https://ci.appveyor.com/project/bollwyvl/nb-conda/branch/master) [![Coverage Status](https://coveralls.io/repos/github/Anaconda-Platform/nb_conda/badge.svg?branch=master)](https://coveralls.io/github/Anaconda-Platform/nb_conda?branch=master)

Provides Conda environment and package access extension from within Jupyter.

## Conda tab in the Jupyter file browser

This extensions adds a Conda tab to the Jupyter file browser. Selecting the Conda tab
will display:

* A list of the Conda environments that current exist
* The list of Conda packages available in currently configured channels
    (http://conda.pydata.org/docs/config.html#channel-locations-channels)
* The list of packages installed in the selected environment.

You can click on the name of an environment to select it. That will allow you to:

* see the packages installed in the environment
* install new packages from the available package list
* check for updates on selected (or all) packages
* update selected (or all) packages in the environment.

### Creating New Environments

There are two ways to create an environment:

* Create a new environment
Use the New Environment button at the top of the page, and select `Python 2`, `Python 3`, or `R` to create a
base environment with the corresponding packages. Note that if you want to run a
Jupyter python kernel in the new environment, you must also install the `ipykernel`
package in the environment.

* Clone an existing environment
Click the clone button next to an environment in the list, and enter the desired name of the
new environment.


## Conda in the Notebook view

This extension adds a Conda Packages item to the Kernel menu. Selecting this item displays
the list of Conda packages in the environment associated with the running kernel, and the
list of available packages. You can perform the same actions as in the Conda tab, but only
against the current environment.

## Changelog

### 1.0.1
- minor build changes

### 1.0.0
- Update to notebook 4.2

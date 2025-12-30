# Getting Started

**Gator** (also known as **Mamba Navigator**) is a powerful web-based UI that makes conda and mamba package management visual and intuitive. Manage your Python, R, and data science environments with point-and-click ease directly in JupyterLab.

## Requirements

- conda version 4.5 or later or mamba version 1.0 or later
- JupyterLab version 4.0 or later (if using the JupyterLab extension)

## Installing Gator

To install Gator in JupyterLab, run the following command:

```{code-block} bash
mamba install -c conda-forge jupyterlab mamba_gator
```

```{tip}
Install [Jupyterlab-tour](https://github.com/fcollonval/jupyterlab-tour) to get an interactive walkthrough of Gator's features:

    conda install -c conda-forge jupyterlab-tour

```

## Quick Start

```{admonition} First Time Using Gator?
:class: tip

**In JupyterLab:** Go to **Settings** → **Conda Packages Manager**

**Standalone:** Run `gator` in your terminal

Then:
1. Select an environment from the left panel
2. Browse packages in the main panel
3. Select package(s) to install
3. Install packages with the "+ Packages" button
4. Try toggling between Direct and Batch modes (see {ref}`direct-batch-toggle`)
```

```{note}
**First load may take a few minutes** while Gator builds the package cache. Subsequent loads will be much faster!
```

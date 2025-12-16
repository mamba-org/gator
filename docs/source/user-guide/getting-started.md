# Getting Started

## Overview

**Gator** (also known as **Mamba Navigator**) is a powerful web-based UI that makes conda and mamba package management visual and intuitive. No more memorizing command-line syntax! Manage your Python, R, and data science environments with point-and-click ease.

::::{grid} 2
:gutter: 3

:::{grid-item-card} 🖥️ For JupyterLab
Integrated extension accessible from Settings menu

**Access:** Settings → Conda Packages Manager
:::

:::{grid-item-card} 🚀 Standalone App
Independent application via `gator` command

**Access:** Run `gator` in terminal
:::

::::

### Why Use Gator?

::::{grid} 1 1 2 2
:gutter: 2

:::{grid-item-card} 🎯 Visual Management
No command-line knowledge required. Point, click, and go!
:::

:::{grid-item-card} 📦 Smart Package Browsing
Search, filter, and discover packages with ease
:::

:::{grid-item-card} ⚡ Batch Operations
Update multiple packages simultaneously
:::

:::{grid-item-card} 🔄 Environment Sync
Import/export environments across systems
:::

::::

## Quick Start

```{admonition} First Time Using Gator?
:class: tip

**In JupyterLab:** Go to **Settings** → **Conda Packages Manager**

**Standalone:** Run `gator` in your terminal

Then:
1. 📂 Select an environment from the left panel
2. 📦 Browse packages in the main panel
3. ⬇️ Install packages with the "Add Packages" button
4. ⚙️ Try toggling between Direct and Batch modes (see {ref}`direct-batch-toggle`)
```

```{note}
**First load may take a few minutes** while Gator builds the package cache. Subsequent loads will be much faster!
```

```{toctree}
:maxdepth: 2
:caption: User Guide Contents

features
```

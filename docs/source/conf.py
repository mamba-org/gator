# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'Gator'
copyright = '2025, Jupyter Development Team'
author = 'Jupyter Development Team'
release = '6.0.2'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    "myst_parser",
    "sphinx.ext.autodoc",      # module index
    "sphinx.ext.autosummary",
]

source_suffix = {
    '.md': 'markdown',
}

myst_enable_extensions = [
    "colon_fence", # ::: directives
    "deflist",
    "linkify",
    "substitution"
]

templates_path = ['_templates']
exclude_patterns = []

import sys
from pathlib import Path

sys.path.insert(0, str(Path("../../mamba_gator").resolve()))


# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

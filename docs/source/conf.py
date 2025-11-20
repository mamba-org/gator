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
    "sphinx_design"
]

source_suffix = {
    '.md': 'markdown',
    '.rst': 'restructuredtext'
}

myst_enable_extensions = [
    "colon_fence", # ::: directives
    "deflist",
    "linkify",
    "substitution"
]

html_theme = 'sphinx_book_theme'
html_theme_options = {
    "repository_url": "https://github.com/mamba-org/gator",
    "use_repository_button": True,
    "use_issues_button": True,
    "use_source_button": True,
    "path_to_docs": "docs/source",
    "show_toc_level": 2,
    "announcement": "🚧 Documentation is under active development. It will be undergoing many changes and additions to the currently displayed material. <a href='https://github.com/mamba-org/gator/issues'>Report issues</a>",
}

templates_path = ['_templates']
exclude_patterns = []

import sys
from pathlib import Path

sys.path.insert(0, str(Path("../../mamba_gator").resolve()))


# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output


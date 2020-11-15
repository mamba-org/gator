# Gator - the conda navigator

This folder contains the conda navigator and the file to open it from the classical notebook.

## Classical notebook

With the introduction of a standalone conda navigator and as the workflow in classical notebook
is based on multi-tabs paradigm, this folder contains also hooks to open the navigator from
the classical notebook UI.

The file needed for that are:

- `static/main.js`: Add an entry in the Kernel menu to open the navigator (in a new window)
- `static/tree.js`: Add a tab in the tree view to open the navigator (in a new window)
- `index.html`: The HTML page for the navigator window opened via the classical notebook

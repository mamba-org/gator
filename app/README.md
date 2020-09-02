# Mamba Navigator as a Lab based application

## Development

```bash
# create a new conda environment
conda env create

# activate the environment
conda activate mamba-navigator

# install the dependencies
yarn

# build the application
yarn run build

# start the app
python main.py

# or with the --no-browser option
python main.py --no-browser
```

The app will open in the browser at http://localhost:8888.

There is also a watch script to automatically rebuild the application when there is a new change:

```bash
yarn run watch
```

## Adding a new plugin

New plugins can be added to the application, by creating a new folder under `src/plugins` and requiring it in the app startup.

Plugins follow the same structure and principles as the core [JupyterLab Plugins](https://jupyterlab.readthedocs.io/en/latest/developer/extension_dev.html#plugins), and can integrate with other JavaScript libraries such as React.

It is possible to reuse existing third-party JupyterLab extensions in this custom build, by adding them to the dependencies in `package.json` and to the list of modules in `src/index.ts`. Check the [p5 Notebook index.ts file](https://github.com/jtpio/p5-notebook/blob/9cc0af83b2fca50292fb012e4a3133818dc49b1c/src/index.ts#L51-L53) as an example.

## Resources

For more examples on building custom JupyterLab-based front-ends:

- JupyterLab examples: https://github.com/jupyterlab/jupyterlab/tree/master/examples
- Pure-JS build (no Python server): https://github.com/jtpio/p5-notebook

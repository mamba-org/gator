import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { App } from '../../app/app';

/**
 * The default paths.
 */
const paths: JupyterFrontEndPlugin<JupyterFrontEnd.IPaths> = {
  id: 'mamba-navigator:paths',
  activate: (app: App): JupyterFrontEnd.IPaths => {
    return app.paths;
  },
  autoStart: true,
  provides: JupyterFrontEnd.IPaths
};

export default paths;

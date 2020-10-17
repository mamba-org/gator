import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { Gator } from '../../app/app';

/**
 * The default paths.
 */
const paths: JupyterFrontEndPlugin<JupyterFrontEnd.IPaths> = {
  id: '@mamba-org/navigator:paths',
  activate: (
    app: JupyterFrontEnd<JupyterFrontEnd.IShell>
  ): JupyterFrontEnd.IPaths => {
    return (app as Gator).paths;
  },
  autoStart: true,
  provides: JupyterFrontEnd.IPaths
};

export default paths;

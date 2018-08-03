import {
  JupyterLab, JupyterLabPlugin, ILayoutRestorer
} from '@jupyterlab/application';

import { Widget } from '@phosphor/widgets';

import { ICommandPalette, InstanceTracker } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { CondaEnvWidget, ICondaEnv, condaEnvId } from './CondaEnvWidget';
import '../style/index.css';
import { JSONExt } from '@phosphor/coreutils';

function activateCondaEnv(app: JupyterLab, palette: ICommandPalette, menu: IMainMenu, 
  restorer: ILayoutRestorer): ICondaEnv{

  const widget = new CondaEnvWidget(-1, -1);

  const command: string = 'condaenv:open-ui';
  app.commands.addCommand(command, {
    label: 'Conda Packages Manager',
    execute: () => {
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        /** Attach the widget to the main work area if it's not there */
        app.shell.addToMainArea(widget as Widget);
      }
      // Call an update
      widget.update();

      /** Activate the widget */
      app.shell.activateById(widget.id);
    }
  });

  /** Add command to command palette */
  palette.addItem({ command, category: 'Settings' });

  /** Add command to settings menu */
  menu.settingsMenu.addGroup([{ command: command }], 999);

  let tracker = new InstanceTracker<Widget>({ namespace: 'conda-env' });
  restorer.restore(tracker, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => 'conda-env'
  })

  return widget;
};

/**
 * Initialization data for the jupyterlab_nb_conda extension.
 */
const extension: JupyterLabPlugin<ICondaEnv> = {
  id: condaEnvId,
  autoStart: true,
  activate: activateCondaEnv,
  requires: [
    ICommandPalette,
    IMainMenu,
    ILayoutRestorer
  ],
  provides: ICondaEnv
};

export default extension;

import {
  JupyterLab, JupyterLabPlugin, ILayoutRestorer
} from '@jupyterlab/application';

import { Widget } from '@phosphor/widgets';

import { ICommandPalette, InstanceTracker } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { CondaEnvWidget, condaEnvId } from './CondaEnvWidget';
import { JSONExt } from '@phosphor/coreutils';
import { ICondaEnv, EnvironmentsModel } from './models';
import '../style/index.css';

function activateCondaEnv(app: JupyterLab, palette: ICommandPalette, menu: IMainMenu, 
  restorer: ILayoutRestorer): ICondaEnv{
  
  const { commands, shell } = app;
  const plugin_namespace = 'conda-env';
  const model = new EnvironmentsModel();
  let widget: CondaEnvWidget;  

  const command: string = 'condaenv:open-ui';

  let tracker = new InstanceTracker<Widget>({ namespace: plugin_namespace });
  restorer.restore(tracker, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => plugin_namespace
  })

  commands.addCommand(command, {
    label: 'Conda Packages Manager',
    execute: () => {
      if (!widget) {
        widget = new CondaEnvWidget(-1, -1, model);
        widget.addClass('jp-CondaEnv');
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        widget.id = plugin_namespace;
        widget.title.label = 'Conda Packages Manager';
        widget.title.closable = true;
        /** Attach the widget to the main work area if it's not there */
        shell.addToMainArea(widget as Widget);
      }      

      /** Activate the widget */
      shell.activateById(widget.id);
    }
  });

  /** Add command to command palette */
  palette.addItem({ command, category: 'Settings' });

  /** Add command to settings menu */
  menu.settingsMenu.addGroup([{ command: command }], 999);

  return model;
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

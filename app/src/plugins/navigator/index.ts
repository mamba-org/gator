import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { DOMUtils, MainAreaWidget } from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

import { CondaEnvWidget } from 'jupyterlab_conda/lib/CondaEnvWidget';

import { CondaEnvironments } from 'jupyterlab_conda/lib/services';

import { condaIcon } from 'jupyterlab_conda/lib/icon';

import { IMainMenu } from '../top/tokens';

import { mambaIcon } from '../../icons';

/**
 * The command ids used by the main navigator plugin.
 */
export namespace CommandIDs {
  export const open = 'mamba-navigator:open';
}

/**
 * The main navigator plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'mamba-navigator:main',
  autoStart: true,
  optional: [IMainMenu],
  activate: (app: JupyterFrontEnd, menu: IMainMenu | null): void => {
    const { commands } = app;

    const model = new CondaEnvironments();
    const content = new CondaEnvWidget(-1, -1, model);
    content.id = DOMUtils.createDomID();
    content.title.label = 'Packages';
    content.title.caption = 'Conda Packages Manager';
    content.title.icon = condaIcon;
    const widget = new MainAreaWidget({ content });
    app.shell.add(widget, 'main');

    commands.addCommand(CommandIDs.open, {
      label: 'Open',
      execute: () => {
        const widget = new Widget();
        mambaIcon.element({
          container: widget.node,
          elementPosition: 'center',
          margin: '5px 5px 5px 5px',
          height: 'auto',
          width: 'auto'
        });
        widget.id = DOMUtils.createDomID();
        widget.title.label = 'Mamba Logo';
        app.shell.add(widget, 'main');
      }
    });

    if (menu) {
      menu.fileMenu.addGroup([{ command: CommandIDs.open }]);
    }
  }
};

export default plugin;

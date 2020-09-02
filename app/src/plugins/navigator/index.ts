import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { DOMUtils } from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

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

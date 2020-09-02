import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IMainMenu } from '../top/tokens';

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
        console.log('Open Command');
      }
    });

    if (menu) {
      menu.fileMenu.addGroup([{ command: CommandIDs.open }]);
    }
  }
};

export default plugin;

import { IJupyterLabMenu } from '@jupyterlab/mainmenu';

import { CommandRegistry } from '@lumino/commands';

import { MenuBar } from '@lumino/widgets';

import { FileMenu } from './file';

import { HelpMenu } from './help';

import { IMainMenu } from './tokens';

/**
 * The main menu.
 */
export class MainMenu extends MenuBar implements IMainMenu {
  /**
   * Construct the main menu bar.
   *
   * @param options The instantiation options for a Menu.
   */
  constructor(options: MainMenu.IOptions) {
    super();
    const { commands } = options;
    this._fileMenu = new FileMenu({ commands });
    this._helpMenu = new HelpMenu({ commands });

    this.addMenu(this._fileMenu.menu);
    this.addMenu(this._helpMenu.menu);
  }

  /**
   * Get the file menu.
   */
  get fileMenu(): IJupyterLabMenu {
    return this._fileMenu;
  }

  /**
   * Get the help menu.
   */
  get helpMenu(): IJupyterLabMenu {
    return this._helpMenu;
  }

  private _fileMenu: FileMenu;
  private _helpMenu: HelpMenu;
}

/**
 * A namespaces for `MainMenu` statics.
 */
export namespace MainMenu {
  /**
   * The instantiation options for a MainMenu.
   */
  export interface IOptions {
    /**
     * The command registry.
     */
    commands: CommandRegistry;
  }
}

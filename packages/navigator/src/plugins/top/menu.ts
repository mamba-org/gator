import { IJupyterLabMenu } from '@jupyterlab/mainmenu';

import { CommandRegistry } from '@lumino/commands';

import { MenuBar } from '@lumino/widgets';

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
    this._helpMenu = new HelpMenu({ commands });

    this.addMenu(this._helpMenu.menu);
  }

  /**
   * Get the help menu.
   */
  get helpMenu(): IJupyterLabMenu {
    return this._helpMenu;
  }

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

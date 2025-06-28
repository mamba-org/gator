import { CommandRegistry } from '@lumino/commands';
import { MenuBar, Menu } from '@lumino/widgets';
import { HelpMenu } from './help';
import { IMainMenu } from './tokens';

import { IRankedMenu } from '@jupyterlab/ui-components';

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

    const menuToAdd: Menu = this._helpMenu as any as Menu; // Cast to Menu since it extends Menu

    this.addMenu(menuToAdd);
  }

  /**
   * Get the help menu.
   */
  get helpMenu(): IRankedMenu {
    return this._helpMenu;
  }

  private _helpMenu: HelpMenu;
}

/**
 * A namespace for `MainMenu` statics.
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

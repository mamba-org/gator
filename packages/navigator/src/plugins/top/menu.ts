import { CommandRegistry } from '@lumino/commands';
import { MenuBar, Menu } from '@lumino/widgets';
import { HelpMenu } from './help';
import { IMainMenu } from './tokens';
import { isJupyterLab4, getMenuInterface } from './utils';

// TODO: Replace with this import when dropping JupyterLab 3 support:
// import { IRankedMenu } from '@jupyterlab/ui-components';

// Temporary compatibility for JupyterLab 3 & 4 interface types
type IMenuInterface = ReturnType<typeof getMenuInterface>;

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

    // Handle the API difference between JupyterLab 3 and 4:
    // - JL3: need to access .menu property
    // - JL4: HelpMenu extends Menu directly
    const menuToAdd: Menu = isJupyterLab4()
      ? (this._helpMenu as any as Menu) // Cast to Menu since it extends Menu in JL4
      : (this._helpMenu as any).menu; // Access .menu property in JL3

    this.addMenu(menuToAdd);
  }

  /**
   * Get the help menu.
   */
  get helpMenu(): IMenuInterface {
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

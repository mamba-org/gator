import { Token } from '@lumino/coreutils';

import { Menu } from '@lumino/widgets';

/**
 * The main menu token.
 */
export const IMainMenu = new Token<IMainMenu>(
  '@mamba-org/navigator/menu:IMainMenu'
);

/**
 * The main menu interface.
 */
export interface IMainMenu {
  /**
   * Add a new menu to the main menu bar.
   */
  addMenu(menu: Menu): void;
}

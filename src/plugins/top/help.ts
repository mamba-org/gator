import { JupyterLabMenu } from '@jupyterlab/mainmenu';

import { Menu } from '@lumino/widgets';

/**
 * A concrete implementation of a help menu.
 */
export class HelpMenu extends JupyterLabMenu {
  /**
   * Construct a help menu.
   *
   * @param options The instantiation options for a HelpMenu.
   */
  constructor(options: Menu.IOptions) {
    super(options);

    this.menu.title.label = 'Help';
  }
}

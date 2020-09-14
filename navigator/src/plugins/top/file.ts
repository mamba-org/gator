import { JupyterLabMenu } from '@jupyterlab/mainmenu';

import { Menu } from '@lumino/widgets';

/**
 * A concrete implementation of a file menu.
 */
export class FileMenu extends JupyterLabMenu {
  /**
   * Construct a file menu.
   *
   * @param options The instantiation options for a FileMenu.
   */
  constructor(options: Menu.IOptions) {
    super(options);

    this.menu.title.label = 'File';
  }
}

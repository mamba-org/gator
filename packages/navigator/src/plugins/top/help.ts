import { Menu } from '@lumino/widgets';
import { RankedMenu } from '@jupyterlab/ui-components';

/**
 * A concrete implementation of a help menu.
 */
export class HelpMenu extends RankedMenu {
  /**
   * Construct a help menu.
   *
   * @param options The instantiation options for a HelpMenu.
   */
  constructor(options: Menu.IOptions) {
    super(options);

    this.title.label = 'Help';
  }
}

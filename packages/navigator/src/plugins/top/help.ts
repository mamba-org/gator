import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';

/**
 * A concrete implementation of a help menu.
 */
export class HelpMenu extends RankedMenu implements IRankedMenu {
  /**
   * Construct a help menu.
   *
   * @param options The instantiation options for a HelpMenu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);

    this.title.label = 'Help';
  }
}

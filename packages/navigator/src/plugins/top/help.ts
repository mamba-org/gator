import { Menu } from '@lumino/widgets';
import { isJupyterLab4, getMenuBaseClass } from './utils';

// TODO: Replace with this import when dropping JupyterLab 3 support:
// import { RankedMenu } from '@jupyterlab/ui-components';

// Temporary compatibility for JupyterLab 3 & 4
const RankedMenu = getMenuBaseClass();

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

    // Use the non-deprecated API based on version:
    // - JL3: JupyterLabMenu.menu.title.label (required)
    // - JL4: RankedMenu.title.label (direct access, no deprecation)
    if (isJupyterLab4()) {
      this.title.label = 'Help';
    } else {
      (this as any).menu.title.label = 'Help';
    }
  }
}

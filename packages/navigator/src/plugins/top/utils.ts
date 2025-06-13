/**
 * JupyterLab version compatibility utilities
 *
 * TODO: Remove this file when dropping JupyterLab 3 support
 */

/**
 * Detect if we're running on JupyterLab 4.x
 *
 * @returns true if JupyterLab 4.x, false if JupyterLab 3.x
 */
export function isJupyterLab4(): boolean {
  try {
    require.resolve('@jupyterlab/ui-components');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the appropriate menu base class for the current JupyterLab version
 *
 * @returns RankedMenu (JL4) or JupyterLabMenu (JL3)
 */
export function getMenuBaseClass(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@jupyterlab/ui-components').RankedMenu;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@jupyterlab/mainmenu').JupyterLabMenu;
  }
}

/**
 * Get the appropriate menu interface for the current JupyterLab version
 *
 * @returns IRankedMenu (JL4) or IJupyterLabMenu (JL3)
 */
export function getMenuInterface(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@jupyterlab/ui-components').IRankedMenu;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@jupyterlab/mainmenu').IJupyterLabMenu;
  }
}

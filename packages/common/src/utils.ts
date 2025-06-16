/**
 * JupyterLab version compatibility utilities
 *
 * TODO: Remove this file when dropping JupyterLab 3 support
 */

declare const require: (id: string) => any;

// TODO: Replace with this import when dropping JupyterLab 3 support:
// import { ReactWidget } from '@jupyterlab/ui-components';

// Temporary compatibility for JupyterLab 3 & 4
export const ReactWidget = (() => {
  try {
    return (require as any)('@jupyterlab/ui-components').ReactWidget;
  } catch {
    return (require as any)('@jupyterlab/apputils').ReactWidget;
  }
})();

// TODO: Replace with this import when dropping JupyterLab 3 support:
// import { UseSignal } from '@jupyterlab/ui-components';

// Temporary compatibility for JupyterLab 3 & 4
export const UseSignal = (() => {
  try {
    return (require as any)('@jupyterlab/ui-components').UseSignal;
  } catch {
    return (require as any)('@jupyterlab/apputils').UseSignal;
  }
})();

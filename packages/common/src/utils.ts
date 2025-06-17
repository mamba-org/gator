import * as UIComponents from '@jupyterlab/ui-components';
import * as AppUtils from '@jupyterlab/apputils';

// Use the one that's available
export const ReactWidget =
  (UIComponents as any)?.ReactWidget || (AppUtils as any)?.ReactWidget;
export const UseSignal =
  (UIComponents as any)?.UseSignal || (AppUtils as any)?.UseSignal;

if (!ReactWidget) {
  throw new Error('ReactWidget not found in either package');
}

console.log(
  '✓ Using',
  ReactWidget.name,
  'from',
  (UIComponents as any)?.ReactWidget ? 'ui-components' : 'apputils'
);

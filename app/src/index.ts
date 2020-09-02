import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { App } from './app/app';

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';
import '@jupyterlab/theme-light-extension/style/variables.css';

import '../style/index.css';

(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'navigator/'
);

/**
 * The main function
 */
async function main(): Promise<void> {
  const app = new App();
  const mods = [
    require('./plugins/paths'),
    require('./plugins/navigator'),
    require('./plugins/top')
    // require('@jupyterlab/theme-light-extension'),
  ];

  app.registerPluginModules(mods);

  await app.start();
  await app.restored;
}

window.addEventListener('load', main);

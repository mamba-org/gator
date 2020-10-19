import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { Gator } from './app/app';

import '../style/index.css';

(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'gator/'
);

/**
 * The main function
 */
async function main(): Promise<void> {
  const app = new Gator();
  const mods = [require('./plugins/navigator'), require('./plugins/top')];

  app.registerPluginModules(mods);

  await app.start();
}

window.addEventListener('load', main);

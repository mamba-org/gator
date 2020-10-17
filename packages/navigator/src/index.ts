import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { Gator } from './app/app';

import '../style/index.css';

(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'navigator/'
);

/**
 * The main function
 */
async function main(): Promise<void> {
  const app = new Gator();
  const mods = [
    require('./plugins/paths'),
    require('./plugins/navigator'),
    require('./plugins/top')
  ];

  app.registerPluginModules(mods);

  await app.start();
  await app.restored;
}

window.addEventListener('load', main);

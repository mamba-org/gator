import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'static/gator/'
);

import { Gator } from './app/app';

import '../style/index.css';

/**
 * The main function
 */
export default async function main(): Promise<void> {
  const app = new Gator();
  const mods = [
    require('./plugins/paths'),
    require('./plugins/navigator'),
    require('./plugins/top')
  ];

  app.registerPluginModules(mods);

  await app.start();
}

window.addEventListener('load', main);

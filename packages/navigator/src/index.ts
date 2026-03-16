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
  const paths = import('./plugins/paths');
  const notifications = import('./plugins/notifications');
  const navigator = import('./plugins/navigator');
  const top = import('./plugins/top');
  const mods = await Promise.all([paths, notifications, navigator, top]);

  app.registerPluginModules(mods);

  await app.start();
}

window.addEventListener('load', main);

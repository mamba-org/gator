import 'whatwg-fetch';

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

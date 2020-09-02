import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { LabIcon } from '@jupyterlab/ui-components';

import { Widget } from '@lumino/widgets';

import { MainMenu } from './menu';

import { IMainMenu } from './tokens';

import mambaIconStr from '../../../style/mamba.svg';

/**
 * The main menu plugin.
 */
const plugin: JupyterFrontEndPlugin<IMainMenu> = {
  id: 'mamba-navigator:menu',
  autoStart: true,
  provides: IMainMenu,
  activate: (app: JupyterFrontEnd): IMainMenu => {
    const logo = new Widget();
    const icon = new LabIcon({ name: 'mamba-icon', svgstr: mambaIconStr });
    icon.element({
      container: logo.node,
      elementPosition: 'center',
      margin: '2px 2px 2px 8px',
      height: 'auto',
      width: '16px'
    });
    logo.id = 'mamba-logo';

    const { commands } = app;
    const menu = new MainMenu({ commands });
    menu.id = 'navigator-menu';

    app.shell.add(logo, 'top');
    app.shell.add(menu, 'top');

    return menu;
  }
};

export default plugin;

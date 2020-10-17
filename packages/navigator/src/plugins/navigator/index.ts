import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { DOMUtils, MainAreaWidget } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import {
  CondaEnvironments,
  CondaEnvWidget,
  condaIcon,
  CONDA_WIDGET_CLASS
} from '@mamba-org/common';
import { mambaIcon } from '../../icons';
import { IMainMenu } from '../top/tokens';

/**
 * The command ids used by the main navigator plugin.
 */
export namespace CommandIDs {
  export const open = '@mamba-org/navigator:open';
}

/**
 * The main navigator plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@mamba-org/navigator:main',
  autoStart: true,
  optional: [IMainMenu],
  activate: (app: JupyterFrontEnd, menu: IMainMenu | null): void => {
    const { commands } = app;

    const model = new CondaEnvironments();
    const content = new CondaEnvWidget(-1, -1, model);
    content.addClass(CONDA_WIDGET_CLASS);
    content.id = DOMUtils.createDomID();
    content.title.label = 'Packages';
    content.title.caption = 'Conda Packages Manager';
    content.title.icon = condaIcon;
    const widget = new MainAreaWidget({ content });
    app.shell.add(widget, 'main');

    commands.addCommand(CommandIDs.open, {
      label: 'Open',
      execute: () => {
        const widget = new Widget();
        mambaIcon.element({
          container: widget.node,
          elementPosition: 'center',
          margin: '5px 5px 5px 5px',
          height: 'auto',
          width: 'auto'
        });
        widget.id = DOMUtils.createDomID();
        widget.title.label = 'Mamba Logo';
        app.shell.add(widget, 'main');
      }
    });

    if (menu) {
      menu.fileMenu.addGroup([{ command: CommandIDs.open }]);
    }
  }
};

export default plugin;

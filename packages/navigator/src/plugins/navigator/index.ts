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
import { INotification } from 'jupyterlab_toastify';
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

    // Request listing available package as quickly as possible
    Private.loadPackages(model);

    const content = new CondaEnvWidget(model);
    content.addClass(CONDA_WIDGET_CLASS);
    content.id = DOMUtils.createDomID();
    content.title.label = 'Packages';
    content.title.caption = 'Conda Packages Manager';
    content.title.icon = condaIcon;
    const widget = new MainAreaWidget({ content });
    widget.title.closable = false;
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

/* eslint-disable no-inner-declarations */
namespace Private {
  export function loadPackages(model: CondaEnvironments): void {
    let packageFound = false;
    let toastId: React.ReactText;
    const messages = [
      'I know you want to give up, but wait a bit longer...',
      'Why is conda so popular, still loading that gigantic packages list...',
      'Take a break, available packages list are still loading...',
      'Available packages list still loading...'
    ];

    function displayMessage(message: React.ReactNode): void {
      setTimeout(() => {
        if (!packageFound) {
          INotification.update({
            message,
            toastId
          });
          if (messages.length > 0) {
            displayMessage(messages.pop());
          }
        }
      }, 60000);
    }

    model
      .getPackageManager()
      .refreshAvailablePackages(false)
      .then(() => {
        packageFound = true;
        if (toastId) {
          INotification.dismiss(toastId);
        }
      })
      .catch((reason: Error) => {
        console.debug('Fail to cache available packages list.', reason);
        if (toastId) {
          INotification.dismiss(toastId);
        }
      });

    // Tell the user after a minute than the extension if still trying to get
    // the available packages list
    setTimeout(() => {
      if (!packageFound) {
        INotification.inProgress(
          'Loading the available packages list in background...'
        ).then(id => {
          toastId = id;
        });
        displayMessage(messages.pop());
      }
    }, 60000);
  }
}
/* eslint-enable no-inner-declarations */

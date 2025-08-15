import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { DOMUtils, MainAreaWidget, Notification } from '@jupyterlab/apputils';
import {
  CondaEnvironments,
  CondaEnvWidget,
  condaIcon,
  CONDA_WIDGET_CLASS
} from '@mamba-org/gator-common';
import { registerEnvCommands } from '@mamba-org/gator-common';

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
  activate: (app: JupyterFrontEnd): void => {
    const model = new CondaEnvironments();

    // Request listing available package as quickly as possible
    Private.loadPackages(model);

    const content = new CondaEnvWidget(model, app.commands) as any;
    content.addClass(CONDA_WIDGET_CLASS);
    content.id = DOMUtils.createDomID();
    content.title.label = 'Packages';
    content.title.caption = 'Conda Packages Manager';
    content.title.icon = condaIcon;
    const widget = new MainAreaWidget({ content: content });
    registerEnvCommands(app.commands, model);
    widget.title.closable = false;
    app.shell.add(widget, 'main');
  }
};

export default plugin;

/* eslint-disable no-inner-declarations */
namespace Private {
  export function loadPackages(model: CondaEnvironments): void {
    let packageFound = false;
    let toastId = '';
    const messages = [
      'I know you want to give up, but wait a bit longer...',
      'Why is conda so popular, still loading that gigantic packages list...',
      'Take a break, available packages list are still loading...',
      'Available packages list still loading...'
    ];

    function displayMessage(message: string): void {
      setTimeout(() => {
        if (!packageFound) {
          Notification.update({
            message,
            id: toastId
          });
          if (messages.length > 0) {
            displayMessage(messages.pop()!);
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
          Notification.dismiss(toastId);
        }
      })
      .catch((reason: Error) => {
        console.debug('Fail to cache available packages list.', reason);
        if (toastId) {
          Notification.dismiss(toastId);
        }
      });

    // Tell the user after a minute than the extension if still trying to get
    // the available packages list
    setTimeout(() => {
      if (!packageFound) {
        toastId = Notification.emit(
          'Loading the available packages list in background...',
          'in-progress'
        );
        displayMessage(messages.pop()!);
      }
    }, 60000);
  }
}
/* eslint-enable no-inner-declarations */

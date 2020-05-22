import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";
import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from "@jupyterlab/apputils";
import { ISettingRegistry } from "@jupyterlab/coreutils";
import { IMainMenu } from "@jupyterlab/mainmenu";
import { INotification } from "jupyterlab_toastify";
import { classes, style } from "typestyle";
import { GlobalStyle } from "./components/globalStyles";
import { condaEnvId, CondaEnvWidget } from "./CondaEnvWidget";
import { CondaEnvironments } from "./services";
import { IEnvironmentManager } from "./tokens";
import {
  companionID,
  CompanionValidator,
  ICompanionValidator
} from "./validator";

export { Conda, IEnvironmentManager } from "./tokens";

async function activateCondaEnv(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  menu: IMainMenu,
  restorer: ILayoutRestorer,
  settingsRegistry: ISettingRegistry
): Promise<IEnvironmentManager> {
  const { commands, shell } = app;
  const pluginNamespace = "conda-env";
  const command = "jupyter_conda:open-ui";

  const settings = await settingsRegistry.load(condaEnvId);
  const model = new CondaEnvironments(settings);

  // Request listing available package as quickly as possible
  Private.loadPackages(model);

  // Track and restore the widget state
  const tracker = new WidgetTracker<MainAreaWidget<CondaEnvWidget>>({
    namespace: pluginNamespace
  });
  let content: CondaEnvWidget;

  commands.addCommand(command, {
    label: "Conda Packages Manager",
    execute: () => {
      if (tracker.currentWidget) {
        shell.activateById(tracker.currentWidget.id);
        return;
      }

      content = new CondaEnvWidget(-1, -1, model);
      content.addClass("jp-NbConda");
      content.id = pluginNamespace;
      content.title.label = "Packages";
      content.title.caption = "Conda Packages Manager";
      content.title.iconClass = Style.TabIcon;
      const widget = new MainAreaWidget({ content });

      void tracker.add(widget);
      shell.add(widget, "main");
    }
  });

  // Add command to command palette
  palette.addItem({ command, category: "Settings" });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    name: () => pluginNamespace
  });

  // Add command to settings menu
  menu.settingsMenu.addGroup([{ command: command }], 999);

  return model;
}

async function activateCompanions(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  envManager: IEnvironmentManager,
  settingsRegistry: ISettingRegistry
): Promise<ICompanionValidator> {
  const { commands, serviceManager } = app;
  const command = "jupyter_conda:companions";
  const settings = await settingsRegistry.load(condaEnvId);

  const validator = new CompanionValidator(
    serviceManager,
    envManager,
    settings
  );

  commands.addCommand(command, {
    label: "Validate kernels compatibility",
    execute: () => {
      validator.validate(serviceManager.specs);
    }
  });

  // Add command to command palette
  palette.addItem({ command, category: "Troubleshooting" });

  return validator;
}

/**
 * Initialization data for the jupyterlab_conda extension.
 */
const condaManager: JupyterFrontEndPlugin<IEnvironmentManager> = {
  id: condaEnvId,
  autoStart: true,
  activate: activateCondaEnv,
  requires: [ICommandPalette, IMainMenu, ILayoutRestorer, ISettingRegistry],
  provides: IEnvironmentManager
};

/**
 * Initialization data for the jupyterlab_kernel_companions extension.
 */
const companions: JupyterFrontEndPlugin<ICompanionValidator> = {
  id: companionID,
  autoStart: true,
  activate: activateCompanions,
  requires: [ICommandPalette, IEnvironmentManager, ISettingRegistry],
  provides: ICompanionValidator
};

const extensions = [condaManager, companions];

export default extensions;

/* eslint-disable no-inner-declarations */
namespace Private {
  export function loadPackages(model: CondaEnvironments) {
    let packageFound = false;
    let toastId: React.ReactText;
    const messages = [
      "I know you want to give up, but wait a bit longer...",
      "Why is conda so popular, still loading that gigantic packages list...",
      "Take a break, available packages list are still loading...",
      "Available packages list still loading..."
    ];

    function displayMessage(message: React.ReactNode) {
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
      .catch(reason => {
        console.debug("Fail to cache available packages list.", reason);
        if (toastId) {
          INotification.dismiss(toastId);
        }
      });

    // Tell the user after a minute than the extension if still trying to get
    // the available packages list
    setTimeout(() => {
      if (!packageFound) {
        INotification.inProgress(
          "Loading the available packages list in background..."
        ).then(id => {
          toastId = id;
        });
        displayMessage(messages.pop());
      }
    }, 60000);
  }
}
/* eslint-enable no-inner-declarations */

namespace Style {
  export const TabIcon = classes(
    "fa",
    "fa-cubes",
    style(GlobalStyle.FaIcon, {
      lineHeight: "unset",
      fontWeight: "normal"
    })
  );
}

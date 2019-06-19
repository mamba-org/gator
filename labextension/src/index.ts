import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from "@jupyterlab/application";
import {
  ICommandPalette,
  InstanceTracker,
  MainAreaWidget
} from "@jupyterlab/apputils";
import { IMainMenu } from "@jupyterlab/mainmenu";
import { JSONExt } from "@phosphor/coreutils";
import { classes, style } from "typestyle";
import "../style/index.css";
import { GlobalStyle } from "./components/globalStyles";
import { condaEnvId, CondaEnvWidget } from "./CondaEnvWidget";
import { CondaEnvironments, IEnvironmentManager } from "./services";

export { IEnvironmentManager, Conda } from "./services";

function activateCondaEnv(
  app: JupyterLab,
  palette: ICommandPalette,
  menu: IMainMenu,
  restorer: ILayoutRestorer
): IEnvironmentManager {
  const { commands, shell } = app;
  const plugin_namespace = "conda-env";
  const model = new CondaEnvironments();
  let condaWidget: CondaEnvWidget;

  const command: string = "condaenv:open-ui";

  // Track and restore the widget state
  let tracker = new InstanceTracker<MainAreaWidget<CondaEnvWidget>>({
    namespace: plugin_namespace
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => plugin_namespace
  });

  commands.addCommand(command, {
    label: "Conda Packages Manager",
    execute: () => {
      if (tracker.currentWidget) {
        shell.activateById(tracker.currentWidget.id);
        return;
      }

      condaWidget = new CondaEnvWidget(-1, -1, model);
      condaWidget.addClass("jp-NbConda");
      condaWidget.id = plugin_namespace;
      condaWidget.title.label = "Packages";
      condaWidget.title.caption = "Conda Packages Manager";
      condaWidget.title.iconClass = Style.TabIcon;

      let widget = new MainAreaWidget({ content: condaWidget });
      tracker.add(widget);
      shell.addToMainArea(widget);
    }
  });

  // Add command to command palette
  palette.addItem({ command, category: "Settings" });

  // Add command to settings menu
  menu.settingsMenu.addGroup([{ command: command }], 999);

  return model;
}

/**
 * Initialization data for the jupyterlab_conda extension.
 */
const extension: JupyterLabPlugin<IEnvironmentManager> = {
  id: condaEnvId,
  autoStart: true,
  activate: activateCondaEnv,
  requires: [ICommandPalette, IMainMenu, ILayoutRestorer],
  provides: IEnvironmentManager
};

export default extension;

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

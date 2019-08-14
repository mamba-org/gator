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
import { IMainMenu } from "@jupyterlab/mainmenu";
import { classes, style } from "typestyle";
import { GlobalStyle } from "./components/globalStyles";
import { condaEnvId, CondaEnvWidget } from "./CondaEnvWidget";
import { CondaEnvironments, IEnvironmentManager } from "./services";

export { Conda, IEnvironmentManager } from "./services";

function activateCondaEnv(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  menu: IMainMenu,
  restorer: ILayoutRestorer
): IEnvironmentManager {
  const { commands, shell } = app;
  const plugin_namespace = "conda-env";
  const model = new CondaEnvironments();
  let widget: MainAreaWidget<CondaEnvWidget>;

  const command: string = "condaenv:open-ui";

  commands.addCommand(command, {
    label: "Conda Packages Manager",
    execute: () => {
      if (tracker.currentWidget) {
        shell.activateById(tracker.currentWidget.id);
        return;
      }

      if (!widget) {
        const content = new CondaEnvWidget(-1, -1, model);
        widget = new MainAreaWidget({ content });
        widget.addClass("jp-NbConda");
        widget.id = plugin_namespace;
        widget.title.label = "Packages";
        widget.title.caption = "Conda Packages Manager";
        widget.title.iconClass = Style.TabIcon;
        widget.title.closable = true;
      }

      if (!tracker.has(widget)) {
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        shell.add(widget, "main");
      }
      shell.activateById(widget.id);
    }
  });

  // Add command to command palette
  palette.addItem({ command, category: "Settings" });

  // Track and restore the widget state
  let tracker = new WidgetTracker<MainAreaWidget<CondaEnvWidget>>({
    namespace: plugin_namespace
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command,
    name: () => plugin_namespace
  });

  // Add command to settings menu
  menu.settingsMenu.addGroup([{ command: command }], 999);

  return model;
}

/**
 * Initialization data for the jupyterlab_conda extension.
 */
const extension: JupyterFrontEndPlugin<IEnvironmentManager> = {
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

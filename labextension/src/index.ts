import {
  JupyterLab,
  JupyterLabPlugin,
  ILayoutRestorer
} from "@jupyterlab/application";

import {
  ICommandPalette,
  InstanceTracker,
  MainAreaWidget
} from "@jupyterlab/apputils";

import { IMainMenu } from "@jupyterlab/mainmenu";

import { CondaEnvWidget, condaEnvId } from "./CondaEnvWidget";
import { JSONExt } from "@phosphor/coreutils";
import { ICondaEnv, EnvironmentsModel } from "./models";
import "../style/index.css";
import { GlobalStyle } from "./components/globalStyles";
import { classes, style } from "typestyle";

function activateCondaEnv(
  app: JupyterLab,
  palette: ICommandPalette,
  menu: IMainMenu,
  restorer: ILayoutRestorer
): ICondaEnv {
  const { commands, shell } = app;
  const plugin_namespace = "conda-env";
  const model = new EnvironmentsModel();
  let widget: MainAreaWidget<CondaEnvWidget>;

  const command: string = "condaenv:open-ui";

  commands.addCommand(command, {
    label: "Conda Packages Manager",
    execute: () => {
      if (!widget) {
        let condaWidget = new CondaEnvWidget(-1, -1, model);
        condaWidget.addClass("jp-NbConda");
        condaWidget.id = plugin_namespace;
        condaWidget.title.label = "Packages";
        condaWidget.title.caption = "Conda Packages Manager";
        condaWidget.title.iconClass = Style.TabIcon;

        widget = new MainAreaWidget({ content: condaWidget });
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        shell.addToMainArea(widget);
      }
      // Activate the widget
      shell.activateById(widget.id);
    }
  });

  // Add command to command palette
  palette.addItem({ command, category: "Settings" });

  // Add command to settings menu
  menu.settingsMenu.addGroup([{ command: command }], 999);

  // Track and restore the widget state
  let tracker = new InstanceTracker<MainAreaWidget<CondaEnvWidget>>({
    namespace: plugin_namespace
  });
  restorer.restore(tracker, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => plugin_namespace
  });

  return model;
}

/**
 * Initialization data for the jupyterlab_conda extension.
 */
const extension: JupyterLabPlugin<ICondaEnv> = {
  id: condaEnvId,
  autoStart: true,
  activate: activateCondaEnv,
  requires: [ICommandPalette, IMainMenu, ILayoutRestorer],
  provides: ICondaEnv
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

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
  let widget: CondaEnvWidget;

  const command: string = "condaenv:open-ui";

  let tracker = new InstanceTracker<MainAreaWidget<CondaEnvWidget>>({
    namespace: plugin_namespace
  });
  restorer.restore(tracker, {
    command,
    args: widget => JSONExt.emptyObject,
    name: widget => plugin_namespace
  });

  commands.addCommand(command, {
    label: "Conda Packages Manager",
    execute: () => {
      if (tracker.currentWidget) {
        /** Activate the widget */
        shell.activateById(widget.id);
        return;
      }

      if (!widget) {
        widget = new CondaEnvWidget(-1, -1, model);
        widget.addClass("jp-NbConda");
      }

      if (!widget.isAttached) {
        widget.id = plugin_namespace;
        widget.title.label = "Packages";
        widget.title.caption = "Conda Packages Manager";
        widget.title.iconClass = Style.TabIcon;

        let main = new MainAreaWidget({ content: widget });
        if (!tracker.has(main)) {
          // Track the state of the widget for later restoration
          tracker.add(main);
        }
        /** Attach the widget to the main work area if it's not there */
        shell.addToMainArea(main);
      }
    }
  });

  /** Add command to command palette */
  palette.addItem({ command, category: "Settings" });

  /** Add command to settings menu */
  menu.settingsMenu.addGroup([{ command: command }], 999);

  return model;
}

/**
 * Initialization data for the jupyterlab_nb_conda extension.
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

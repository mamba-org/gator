import { ToolbarButtonComponent } from "@jupyterlab/apputils";
import * as React from "react";
import { style, classes } from "typestyle";
import {
  addIcon,
  fileUploadIcon,
  downloadIcon,
  closeIcon
} from "@jupyterlab/ui-components";

//Toolbar height to align with package toolbar
export const ENVIRONMENTTOOLBARHEIGHT = 40;

/**
 * Environment panel toolbar properties
 */
export interface ICondaEnvToolBarProps {
  /**
   * Is the current environment the root one
   */
  isBase: boolean;
  /**
   * Is the environment list updating
   */
  isPending: boolean;
  /**
   * Create environment handler
   */
  onCreate(): void;
  /**
   * Clone environment handler
   */
  onClone(): void;
  /**
   * Import environment handler
   */
  onImport(): void;
  /**
   * Export environment handler
   */
  onExport(): void;
  /**
   * Refresh environment handler
   */
  onRefresh(): void;
  /**
   * Remove environment handler
   */
  onRemove(): void;
}

export const CondaEnvToolBar = (props: ICondaEnvToolBarProps): JSX.Element => {
  let refreshClasses = classes("fa", "fa-refresh", Style.StandardButton);
  if (props.isPending) {
    refreshClasses = refreshClasses + " fa-spin";
  }
  return (
    <div className={Style.NoGrow}>
      <div className={Style.Title}>
        <span className={Style.Grow}>Conda environments</span>
        <ToolbarButtonComponent
          iconClass={refreshClasses}
          tooltip="Refresh environments"
          onClick={props.onRefresh}
        />
      </div>
      <div className="lm-Widget jp-Toolbar jp-NbConda-EnvToolbar">
        <ToolbarButtonComponent
          icon={addIcon}
          tooltip="Create"
          onClick={props.onCreate}
        />
        <ToolbarButtonComponent
          iconClass={classes("fa", "fa-clone", Style.StandardButton)}
          tooltip="Clone"
          onClick={props.onClone}
          enabled={!props.isBase}
        />
        <ToolbarButtonComponent
          icon={fileUploadIcon}
          tooltip="Import"
          onClick={props.onImport}
        />
        <ToolbarButtonComponent
          icon={downloadIcon}
          tooltip="Export"
          onClick={props.onExport}
        />
        <ToolbarButtonComponent
          icon={closeIcon}
          tooltip="Remove"
          onClick={props.onRemove}
          enabled={!props.isBase}
        />
      </div>
    </div>
  );
};

namespace Style {
  export const Grow = style({
    flexGrow: 1,
    flexShrink: 1
  });

  export const NoGrow = style({
    flexGrow: 0,
    flexShrink: 0
  });

  export const StandardButton = style({
    color: "var(--jp-inverse-layout-color3)"
  });

  export const Title = style({
    color: "var(--jp-ui-font-color1)",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "var(--jp-ui-font-size2)",
    height: ENVIRONMENTTOOLBARHEIGHT,
    display: "flex",
    flex: "0 0 auto",
    flexDirection: "row"
  });
}

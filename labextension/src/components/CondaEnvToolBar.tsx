import { ToolbarButtonComponent } from "@jupyterlab/apputils";
import * as React from "react";
import { style } from "typestyle";

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
  let refreshClasses = "fa fa-refresh";
  if (props.isPending) {
    refreshClasses = refreshClasses + " fa-spin";
  }
  return (
    <div className={Style.NoGrow}>
      <div className={Style.Title}>
        <span className={Style.Grow}>Conda environments</span>
        <ToolbarButtonComponent
          iconClassName={refreshClasses}
          tooltip="Refresh environments"
          onClick={props.onRefresh}
        />
      </div>
      <div className="p-Widget jp-Toolbar jp-NbConda-EnvToolbar">
        <ToolbarButtonComponent
          iconClassName="jp-AddIcon"
          tooltip="Create"
          onClick={props.onCreate}
        />
        <ToolbarButtonComponent
          iconClassName="fa fa-clone"
          tooltip="Clone"
          onClick={props.onClone}
          enabled={!props.isBase}
        />
        <ToolbarButtonComponent
          iconClassName="jp-FileUploadIcon"
          tooltip="Import"
          onClick={props.onImport}
        />
        <ToolbarButtonComponent
          iconClassName="jp-DownloadIcon"
          tooltip="Export"
          onClick={props.onExport}
        />
        <ToolbarButtonComponent
          iconClassName="jp-CloseIcon"
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

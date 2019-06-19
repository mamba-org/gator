import * as React from "react";

/**
 * Environment panel toolbar properties
 */
export interface CondaEnvToolBarProps {
  /**
   * Is the current environment the root one
   */
  isBase: boolean;
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
   * Remove environment handler
   */
  onRemove(): void;
}

export const CondaEnvToolBar = (props: CondaEnvToolBarProps) => {
  return (
    <div className="p-Widget jp-Toolbar jp-NbConda-EnvToolbar">
      <div className="p-Widget jp-ToolbarButton jp-Toolbar-item">
        <button
          className="jp-ToolbarButtonComponent"
          title="Create"
          onClick={props.onCreate}
        >
          <span className="jp-AddIcon jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon" />
        </button>
      </div>
      <div className="p-Widget jp-ToolbarButton jp-Toolbar-item">
        <button
          className="jp-ToolbarButtonComponent"
          title="Clone"
          onClick={props.onClone}
          disabled={props.isBase}
        >
          <span className="fa fa-clone jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon" />
        </button>
      </div>
      <div className="p-Widget jp-ToolbarButton jp-Toolbar-item">
        <button
          className="jp-ToolbarButtonComponent"
          title="Import"
          onClick={props.onImport}
        >
          <span className="jp-FileUploadIcon jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon" />
        </button>
      </div>
      <div className="p-Widget jp-ToolbarButton jp-Toolbar-item">
        <button
          className="jp-ToolbarButtonComponent"
          title="Export"
          onClick={props.onExport}
        >
          <span className="jp-DownloadIcon jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon" />
        </button>
      </div>
      <div className="p-Widget jp-ToolbarButton jp-Toolbar-item">
        <button
          className="jp-ToolbarButtonComponent"
          title="Remove"
          onClick={props.onRemove}
          disabled={props.isBase}
        >
          <span className="jp-CloseIcon jp-Icon jp-Icon-16 jp-ToolbarButtonComponent-icon" />
        </button>
      </div>
    </div>
  );
};

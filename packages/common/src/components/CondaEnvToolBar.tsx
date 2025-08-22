import { ToolbarButtonComponent } from '@jupyterlab/apputils';
import { addIcon, fileUploadIcon } from '@jupyterlab/ui-components';
import * as React from 'react';
import { style } from 'typestyle';
import { CONDA_ENVIRONMENT_TOOLBAR_CLASS } from '../constants';

//Toolbar height to align with package toolbar
export const ENVIRONMENT_TOOLBAR_HEIGHT = 40;

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
   * Import environment handler
   */
  onImport(): void;
}

export const CondaEnvToolBar = (props: ICondaEnvToolBarProps): JSX.Element => {
  return (
    <div className={Style.NoGrow}>
      <div
        className={`lm-Widget jp-Toolbar ${CONDA_ENVIRONMENT_TOOLBAR_CLASS} ${Style.Toolbar}`}
      >
        <ToolbarButtonComponent
          icon={addIcon}
          tooltip="Create"
          onClick={props.onCreate}
        />
        <ToolbarButtonComponent
          icon={fileUploadIcon}
          tooltip="Import"
          onClick={props.onImport}
        />
      </div>
    </div>
  );
};

namespace Style {
  export const NoGrow = style({
    flexGrow: 0,
    flexShrink: 0
  });
  export const Toolbar = style({
    alignItems: 'center',
    height: ENVIRONMENT_TOOLBAR_HEIGHT
  });
}

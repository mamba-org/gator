import { ToolbarButtonComponent } from '@jupyterlab/apputils';
import { addIcon, fileUploadIcon } from '@jupyterlab/ui-components';
import { syncAltIcon } from '../icon';
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
  /**
   * Refresh environment handler
   */
  onRefresh(): void;
}

export const CondaEnvToolBar = (props: ICondaEnvToolBarProps): JSX.Element => {
  return (
    <div className={Style.NoGrow}>
      <div className={Style.Title}>
        <span className={Style.Grow}>Conda environments</span>
      </div>
      <div
        className={`lm-Widget jp-Toolbar ${CONDA_ENVIRONMENT_TOOLBAR_CLASS}`}
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
        <div data-loading={props.isPending}>
          <ToolbarButtonComponent
            icon={syncAltIcon}
            tooltip="Refresh environments"
            onClick={props.onRefresh}
          />
        </div>
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

  export const Spin = style({
    animation: 'spin 1s linear infinite'
  });

  export const Title = style({
    color: 'var(--jp-ui-font-color1)',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 'var(--jp-ui-font-size2)',
    height: ENVIRONMENT_TOOLBAR_HEIGHT,
    display: 'flex',
    flex: '0 0 auto',
    flexDirection: 'row'
  });
}

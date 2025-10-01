import { ToolbarButtonComponent } from '@jupyterlab/apputils';
import { addIcon } from '@jupyterlab/ui-components';
import * as React from 'react';
import { style } from 'typestyle';

//Toolbar height to align with package toolbar
export const ENVIRONMENT_TOOLBAR_HEIGHT = 40;

/**
 * Environment panel toolbar properties
 */
export interface ICreateEnvButtonProps {
  /**
   * Open create environment dialog handler
   */
  onOpen(): void;
}

export const CreateEnvButton = (props: ICreateEnvButtonProps): JSX.Element => {
  return (
    <div className={`lm-Widget ${Style.EnvToolbar}`}>
      <ToolbarButtonComponent
        icon={addIcon}
        tooltip="Create"
        onClick={props.onOpen}
        label="Create"
        className={`${Style.CreateEnvIconLabelGap} ${Style.ToolbarButton}`}
      />
    </div>
  );
};

namespace Style {
  export const EnvToolbar = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  });

  export const ToolbarButton = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    height: '100%',
    boxSizing: 'border-box',
    margin: 0,
    background: 'var(--jp-layout-color1)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '6px',
    transition:
      'background-color .15s ease, border-color .15s ease, box-shadow .15s ease',
    $nest: {
      '&.jp-ToolbarButtonComponent': { padding: 0 },
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color2)',
        borderColor: 'var(--jp-border-color1)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
      },
      '&:active': {
        backgroundColor: 'var(--jp-layout-color3)'
      },
      '&:focus-visible': {
        outline: '2px solid var(--jp-brand-color2)',
        outlineOffset: '2px'
      },
      '.jp-Icon': { margin: 0 }
    }
  });

  export const CreateEnvIconLabelGap = style({
    $nest: {
      '.jp-ToolbarButtonComponent-label': {
        marginLeft: '6px'
      }
    }
  });
}

import * as React from 'react';
import { style } from 'typestyle';
import { undoIcon } from '../icon';

export interface IPythonVersionSelectorProps {
  selectedVersion: string;
  onResetToTypeVersion: () => void;
  versionFromType?: string;
  /** If user has overridden the env type's version */
  isOverridden?: boolean;
  /** If python version selector is disabled (no Python in env type if its an R env) */
  disabled?: boolean;
}

export const PythonVersionSelector = (
  props: IPythonVersionSelectorProps
): JSX.Element => {
  const displayText = props.disabled
    ? 'N/A'
    : props.selectedVersion === 'auto'
    ? 'Auto (latest)'
    : `Python ${props.selectedVersion}`;

  return (
    <div className={Style.Container}>
      <span className={props.disabled ? Style.DisabledDisplay : Style.Display}>
        {displayText}
      </span>

      {!props.disabled && props.isOverridden && (
        <div className={Style.OverrideContainer}>
          <span className={Style.OverrideText}>
            <span role="img" aria-label="Warning: overriding python version">
              ⚠️ Override
            </span>
          </span>
          <button
            className={Style.ResetButton}
            onClick={() => props.onResetToTypeVersion?.()}
            title={`Reset to Python ${props.versionFromType}`}
            aria-label={`Reset to Python ${props.versionFromType}`}
          >
            <undoIcon.react tag="span" width="14px" height="14px" />
          </button>
        </div>
      )}
    </div>
  );
};

namespace Style {
  export const Container = style({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  });

  export const OverrideContainer = style({
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  });

  export const OverrideText = style({
    fontSize: '11px',
    color: 'var(--jp-warn-color1)',
    fontWeight: 500,
    whiteSpace: 'nowrap'
  });

  export const ResetButton = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    padding: '2px',
    cursor: 'pointer',
    borderRadius: '3px',
    color: 'var(--jp-ui-font-color2)',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color3)',
        color: 'var(--jp-ui-font-color1)'
      },
      '& svg': {
        fill: 'currentColor'
      }
    }
  });

  export const Display = style({
    padding: '8px 12px',
    fontSize: '13px',
    color: 'var(--jp-ui-font-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '3px'
  });

  export const DisabledDisplay = style({
    padding: '8px 12px',
    fontSize: '13px',
    color: 'var(--jp-ui-font-color3)',
    backgroundColor: 'var(--jp-layout-color2)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '3px',
    fontStyle: 'italic'
  });

}

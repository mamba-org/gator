import * as React from 'react';
import { style } from 'typestyle';
import { undoIcon } from '../icon';

export interface IPythonVersionSelectorProps {
  selectedVersion: string;
  onVersionChange: (version: string) => void;
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
  const standardVersions = ['3.14', '3.13', '3.12', '3.11', '3.10', '3.9'];

  const options: Array<{ value: string; label: string }> = [
    { value: 'auto', label: 'Auto (latest)' }
  ];

  standardVersions.forEach(v => {
    options.push({ value: v, label: `Python ${v}` });
  });

  // If the type specifies a version not in our list, add it
  if (
    props.versionFromType &&
    props.versionFromType !== 'auto' &&
    !standardVersions.some(v => v.startsWith(props.versionFromType!))
  ) {
    options.push({
      value: props.versionFromType,
      label: `Python ${props.versionFromType} (from type)`
    });
  }

  return (
    <div className={Style.Container}>
      <select
        className={Style.Select}
        value={props.selectedVersion}
        onChange={e => props.onVersionChange(e.target.value)}
        aria-label="Python version"
        disabled={props.disabled}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {props.disabled && (
        <span className={Style.DisabledHint}>Not in environment type</span>
      )}
      {!props.disabled && props.isOverridden && (
        <div className={Style.OverrideContainer}>
          <span className={Style.OverrideText}>⚠️ Override</span>
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

  export const Select = style({
    flex: 1,
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '3px',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
    $nest: {
      '&:focus': {
        outline: 'none',
        borderColor: 'var(--jp-brand-color1)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    }
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

  export const DisabledHint = style({
    fontSize: '11px',
    color: 'var(--jp-ui-font-color3)',
    fontStyle: 'italic',
    whiteSpace: 'nowrap'
  });
}

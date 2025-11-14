import * as React from 'react';
import { style } from 'typestyle';
import { CommandRegistry } from '@lumino/commands';
import { IEnvironmentManager } from '../tokens';

/**
 * Create environment overlay properties
 */
export interface ICreateEnvDrawerProps {
  /**
   * Environment manager
   */
  model: IEnvironmentManager;
  /**
   * Commands
   */
  commands: CommandRegistry;
  /**
   * Close drawer handler
   */
  onClose: () => void;
  /**
   * On environment created handler
   */
  onEnvironmentCreated: (envName: string) => void;
  /**
   * Environment types
   */
  environmentTypes: string[];
}

export const CreateEnvDrawer = (props: ICreateEnvDrawerProps): JSX.Element => {
  const [envName, setEnvName] = React.useState('');
  const [envType, setEnvType] = React.useState(props.environmentTypes[0] || '');
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreate = async () => {
    if (!envName.trim()) {
      console.error('Environment name is required');
      return;
    }

    if (isCreating) {
      return;
    }
    setIsCreating(true);

    props.onClose();

    try {
      await props.commands.execute('gator-lab:create-env', {
        name: envName,
        type: envType
      });

      props.onEnvironmentCreated(envName);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className={Style.Overlay}>
        <div className={Style.Drawer}>
          <h2>Create Environment</h2>
          <label className={Style.Label}>Name:</label>
          <input
            className={Style.Input}
            type="text"
            placeholder="Environment name"
            value={envName}
            onChange={e => setEnvName(e.target.value)}
            disabled={isCreating}
          />
          <label className={Style.Label}>Type:</label>
          <select
            className={Style.Select}
            value={envType}
            onChange={e => setEnvType(e.target.value)}
            disabled={isCreating}
          >
            {props.environmentTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <div className={Style.ButtonGroup}>
            <button
              className={Style.Button}
              onClick={props.onClose}
              disabled={isCreating}
            >
              Close
            </button>
            <button
              className={`${Style.Button} ${Style.PrimaryButton}`}
              onClick={handleCreate}
              disabled={isCreating || !envName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

namespace Style {
  export const Overlay = style({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(2px)'
  });

  export const Drawer = style({
    // TODO: remove size constraints for width/height/padding, set to 100%and make the drawer full screen
    width: '50%',
    height: '50%',
    backgroundColor: 'var(--jp-layout-color0)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 20px 20px 40px',
    overflow: 'auto'
  });

  export const Label = style({
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--jp-ui-font-color1)',
    marginBottom: '4px',
    marginTop: '8px'
  });

  export const Input = style({
    width: '300px',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: 'var(--jp-border-radius, 3px)',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    marginBottom: '12px',
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

  export const Select = style({
    width: '300px',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: 'var(--jp-border-radius, 3px)',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    marginBottom: '12px',
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

  export const ButtonGroup = style({
    display: 'flex',
    gap: '8px'
  });

  export const Button = style({
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid var(--jp-border-color2)',
    borderRadius: 'var(--jp-border-radius, 3px)',
    backgroundColor: 'var(--jp-layout-color2)',
    color: 'var(--jp-ui-font-color1)',
    cursor: 'pointer',
    $nest: {
      '&:hover:not(:disabled)': {
        backgroundColor: 'var(--jp-layout-color3)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    }
  });

  export const PrimaryButton = style({
    backgroundColor: 'var(--jp-brand-color1)',
    color: 'var(--jp-ui-inverse-font-color1)',
    borderColor: 'var(--jp-brand-color1)',
    $nest: {
      '&:hover:not(:disabled)': {
        backgroundColor: 'var(--jp-brand-color0)'
      }
    }
  });
}

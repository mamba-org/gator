import { Dialog, Notification, showDialog } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { style } from 'typestyle';
import { Conda, IEnvironmentManager } from '../tokens';
import { CondaEnvList, ENVIRONMENT_PANEL_WIDTH } from './CondaEnvList';
import { PACKAGE_TOOLBAR_HEIGHT } from './CondaPkgToolBar';
import { CreateEnvButton } from './CreateEnvButton';
import { CondaPkgPanel } from './CondaPkgPanel';
import { ToolbarButtonComponent } from '@jupyterlab/ui-components';
import { syncAltIcon } from '../icon';
import { openCreateEnvDialog } from './CreateEnvDialog';

/**
 * Jupyter Conda Component properties
 */
export interface ICondaEnvProps {
  /**
   * Component height
   */
  height: number;
  /**
   * Component width
   */
  width: number;
  /**
   * Environment manager
   */
  model: IEnvironmentManager;
  commands: CommandRegistry;
  /**
   * Environment name
   */
  envName?: string;
}

/**
 * Jupyter Conda Component state
 */
export interface ICondaEnvState {
  /**
   * Environment list
   */
  environments: Array<Conda.IEnvironment>;
  /**
   * Active environment
   */
  currentEnvironment?: string;
  /**
   * Conda channels
   */
  channels?: Conda.IChannels;
  /**
   * Is the environment list loading?
   */
  isLoading: boolean;
  /**
   * Environment name
   */
  envName?: string;
}

/** Top level React component for Jupyter Conda Manager */
export class NbConda extends React.Component<ICondaEnvProps, ICondaEnvState> {
  constructor(props: ICondaEnvProps) {
    super(props);

    this.state = {
      environments: [],
      currentEnvironment: undefined,
      isLoading: false,
      envName: props.envName
    };

    this.handleEnvironmentChange = this.handleEnvironmentChange.bind(this);
    this.handleCreateEnvironment = this.handleCreateEnvironment.bind(this);
    this.handleImportEnvironment = this.handleImportEnvironment.bind(this);
    this.handleRefreshEnvironment = this.handleRefreshEnvironment.bind(this);
    this.handleOpenCreateEnvDialog = this.handleOpenCreateEnvDialog.bind(this);

    this.props.model.refreshEnvs.connect(() => {
      this.loadEnvironments();
    });

    this.props.model.envRemoved.connect((_, removedName) => {
      if (removedName === this.state.currentEnvironment) {
        this.setState({ currentEnvironment: undefined, channels: undefined });
      }
    });

    if (props.envName) {
      console.log('Setting current environment to', props.envName);
      this.handleEnvironmentChange(props.envName);
    }
  }

  async handleEnvironmentChange(name: string): Promise<void> {
    this.setState({
      currentEnvironment: name,
      channels: await this.props.model.getChannels(name),
      envName: name
    });

    this.props.model.emitEnvironmentSelectionChanged(name);

    const packageManager = this.props.model.getPackageManager(name);
    if (packageManager) {
      const { primePackages } = await import('../packageActions');
      primePackages(this.props.model, name);
    }
  }

  async handleOpenCreateEnvDialog(): Promise<void> {
    const choice = await openCreateEnvDialog();
    if (choice === 'manual') {
      this.handleCreateEnvironment();
    } else if (choice === 'import') {
      this.handleImportEnvironment();
    } else {
      return;
    }
  }

  async handleCreateEnvironment(): Promise<void> {
    let toastId = '';
    try {
      const body = document.createElement('div');
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Name : ';
      const nameInput = document.createElement('input');
      body.appendChild(nameLabel);
      body.appendChild(nameInput);

      const typeLabel = document.createElement('label');
      typeLabel.textContent = 'Type : ';
      const typeInput = document.createElement('select');
      for (const type of this.props.model.environmentTypes) {
        const option = document.createElement('option');
        option.setAttribute('value', type);
        option.innerText = type;
        typeInput.appendChild(option);
      }
      body.appendChild(typeLabel);
      body.appendChild(typeInput);

      const response = await showDialog({
        title: 'New Environment',
        body: new Widget({ node: body }),
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      });
      if (response.button.accept) {
        if (nameInput.value.length === 0) {
          throw new Error('A environment name should be provided.');
        }
        toastId = Notification.emit(
          `Creating environment ${nameInput.value}`,
          'in-progress'
        );
        await this.props.model.create(nameInput.value, typeInput.value);
        Notification.update({
          id: toastId,
          message: `Environment ${nameInput.value} has been created.`,
          type: 'success',
          autoClose: 5000
        });
        this.setState({ currentEnvironment: nameInput.value });
        this.loadEnvironments();
      }
    } catch (error) {
      if (error !== 'cancelled') {
        console.error(error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error) || 'An unknown error occurred';
        if (toastId) {
          Notification.update({
            id: toastId,
            message: errorMessage,
            type: 'error',
            autoClose: false
          });
        } else {
          Notification.error(errorMessage);
        }
      } else {
        if (toastId) {
          Notification.dismiss(toastId);
        }
      }
    }
  }

  private _readText(file: Blob): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event: any): void {
        resolve(event.target.result);
      };
      reader.readAsText(file);
    });
  }

  async handleImportEnvironment(): Promise<void> {
    let toastId = '';
    try {
      const body = document.createElement('div');
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Name : ';
      const nameInput = document.createElement('input');
      body.appendChild(nameLabel);
      body.appendChild(nameInput);

      const fileLabel = document.createElement('label');
      fileLabel.textContent = 'File : ';
      const fileInput = document.createElement('input');
      fileInput.setAttribute('type', 'file');

      body.appendChild(fileLabel);
      body.appendChild(fileInput);

      const response = await showDialog({
        title: 'Import Environment',
        body: new Widget({ node: body }),
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      });
      if (response.button.accept) {
        if (nameInput.value.length === 0) {
          throw new Error('A environment name should be provided.');
        }
        if ((fileInput.files?.length ?? 0) === 0) {
          throw new Error('A environment file should be selected.');
        }
        toastId = Notification.emit(
          `Import environment ${nameInput.value}`,
          'in-progress'
        );
        const selectedFile = fileInput.files![0];
        const file = await this._readText(selectedFile);
        await this.props.model.import(nameInput.value, file, selectedFile.name);
        Notification.update({
          id: toastId,
          message: `Environment ${nameInput.value} created.`,
          type: 'success',
          autoClose: 5000
        });
        this.setState({ currentEnvironment: nameInput.value });
        this.loadEnvironments();
      }
    } catch (error) {
      if (error !== 'cancelled') {
        console.error(error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error) || 'An unknown error occurred';
        if (toastId) {
          Notification.update({
            id: toastId,
            message: errorMessage,
            type: 'error',
            autoClose: false
          });
        } else {
          Notification.error(errorMessage);
        }
      } else {
        if (toastId) {
          Notification.dismiss(toastId);
        }
      }
    }
  }

  async handleRefreshEnvironment(): Promise<void> {
    await this.loadEnvironments();
  }

  async loadEnvironments(): Promise<void> {
    if (!this.state.isLoading) {
      this.setState({ isLoading: true });
      try {
        const newState: Partial<ICondaEnvState> = {
          environments: await this.props.model.environments
        };
        if (this.state.currentEnvironment === undefined) {
          newState.environments.forEach(env => {
            if (env.is_default) {
              newState.currentEnvironment = env.name;
            }
          });
          newState.channels = await this.props.model.getChannels(
            newState.currentEnvironment
          );
        }
        newState.isLoading = false;
        this.setState(newState as ICondaEnvState);
      } catch (error) {
        if (error !== 'cancelled') {
          console.error(error);
          Notification.error((error as any).message);
        }
      }
    }
  }

  componentDidMount(): void {
    this.loadEnvironments();
  }

  render(): JSX.Element {
    return (
      <div>
        <div className={Style.HeaderContainer}>
          <div className={Style.Grow}>
            <div className={Style.Title}>Environments</div>
            <div className={Style.RefreshButton}>
              <div
                data-loading={this.state.isLoading}
                className={Style.RefreshInner}
              >
                <ToolbarButtonComponent
                  icon={syncAltIcon}
                  tooltip="Refresh Environments"
                  onClick={this.handleRefreshEnvironment}
                  label="Refresh Environments"
                  className={Style.RefreshEnvsIconLabelGap}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={Style.Panel}>
          {/* LEFT COLUMN */}
          <div className={Style.LeftPane}>
            <div
              className={`lm-Widget ${Style.LeftToolbar} ${Style.ToggleCreateEnvDialogButton}`}
            >
              <CreateEnvButton onOpen={this.handleOpenCreateEnvDialog} />
            </div>

            <CondaEnvList
              height={this.props.height - PACKAGE_TOOLBAR_HEIGHT}
              isPending={this.state.isLoading}
              environments={this.state.environments}
              selected={this.state.currentEnvironment}
              onSelectedChange={this.handleEnvironmentChange}
              onOpen={this.handleOpenCreateEnvDialog}
              commands={this.props.commands}
            />
          </div>

          {/* RIGHT COLUMN */}
          <CondaPkgPanel
            height={this.props.height}
            width={this.props.width - ENVIRONMENT_PANEL_WIDTH}
            packageManager={this.props.model.getPackageManager(
              this.state.currentEnvironment
            )}
            commands={this.props.commands}
            envName={this.state.currentEnvironment || ''}
          />
        </div>
      </div>
    );
  }
}

namespace Style {
  export const Panel = style({
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    borderCollapse: 'collapse',
    height: '100%',
    minHeight: 0
  });

  export const HeaderContainer = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    height: '100%',
    minHeight: 0
  });

  export const Grow = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: 'var(--jp-layout-color1)'
  });

  export const Title = style({
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '15px',
    color: 'var(--jp-ui-font-color1)',
    fontWeight: 600,
    fontSize: 'var(--jp-ui-font-size2)',
    lineHeight: 1.2,
    whiteSpace: 'nowrap'
  });

  export const RefreshButton = style({
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '8px',
    whiteSpace: 'nowrap'
  });

  export const RefreshInner = style({
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '6px'
  });

  export const RefreshEnvsIconLabelGap = style({
    $nest: {
      '.jp-ToolbarButtonComponent-label': {
        marginLeft: '6px'
      }
    }
  });

  export const LeftPane = style({
    display: 'flex',
    flexDirection: 'column',
    width: ENVIRONMENT_PANEL_WIDTH,
    minWidth: ENVIRONMENT_PANEL_WIDTH
  });

  export const LeftToolbar = style({
    display: 'flex',
    alignItems: 'stretch',
    height: PACKAGE_TOOLBAR_HEIGHT,
    flexShrink: 0
  });

  export const ToggleCreateEnvDialogButton = style({
    flex: '1 1 auto',
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    minWidth: 0,
    $nest: {
      '& > .jp-ToolbarButtonComponent, & > jp-button.jp-ToolbarButtonComponent':
        {
          flex: '1 1 0% !important',
          width: '100% !important',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 0
        },
      '& > .jp-ToolbarButtonComponent .jp-ToolbarButtonComponent-label': {
        marginLeft: '6px',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }
    }
  });
}

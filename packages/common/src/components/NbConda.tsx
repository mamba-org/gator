import { Dialog, Notification, showDialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { style } from 'typestyle';
import { Conda, IEnvironmentManager } from '../tokens';
import { CondaEnvList, ENVIRONMENT_PANEL_WIDTH } from './CondaEnvList';
import { CondaPkgPanel } from './CondaPkgPanel';

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
}

/** Top level React component for Jupyter Conda Manager */
export class NbConda extends React.Component<ICondaEnvProps, ICondaEnvState> {
  constructor(props: ICondaEnvProps) {
    super(props);

    this.state = {
      environments: [],
      currentEnvironment: undefined,
      isLoading: false
    };

    this.handleEnvironmentChange = this.handleEnvironmentChange.bind(this);
    this.handleCreateEnvironment = this.handleCreateEnvironment.bind(this);
    this.handleCloneEnvironment = this.handleCloneEnvironment.bind(this);
    this.handleImportEnvironment = this.handleImportEnvironment.bind(this);
    this.handleExportEnvironment = this.handleExportEnvironment.bind(this);
    this.handleRefreshEnvironment = this.handleRefreshEnvironment.bind(this);
    this.handleRemoveEnvironment = this.handleRemoveEnvironment.bind(this);
  }

  async handleEnvironmentChange(name: string): Promise<void> {
    this.setState({
      currentEnvironment: name,
      channels: await this.props.model.getChannels(name)
    });
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
        if (toastId) {
          Notification.update({
            id: toastId,
            message: (error as any).message,
            type: 'error',
            autoClose: false
          });
        } else {
          Notification.error((error as any).message);
        }
      } else {
        if (toastId) {
          Notification.dismiss(toastId);
        }
      }
    }
  }

  async handleCloneEnvironment(): Promise<void> {
    let toastId = '';
    try {
      const environmentName = this.state.currentEnvironment;
      if (!environmentName) {
        return;
      }
      const body = document.createElement('div');
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Name : ';
      const nameInput = document.createElement('input');
      body.appendChild(nameLabel);
      body.appendChild(nameInput);

      const response = await showDialog({
        title: 'Clone Environment',
        body: new Widget({ node: body }),
        buttons: [Dialog.cancelButton(), Dialog.okButton({ caption: 'Clone' })]
      });
      if (response.button.accept) {
        if (nameInput.value.length === 0) {
          throw new Error('A environment name should be provided.');
        }
        toastId = Notification.emit(
          `Cloning environment ${environmentName}`,
          'in-progress'
        );
        await this.props.model.clone(environmentName, nameInput.value);
        Notification.update({
          id: toastId,
          message: `Environment ${nameInput.value} created.`,
          type: 'success',
          autoClose: 5000
        });
        if (this.state.currentEnvironment === environmentName) {
          this.setState({ currentEnvironment: nameInput.value });
        }
        this.loadEnvironments();
      }
    } catch (error) {
      if (error !== 'cancelled') {
        console.error(error);
        if (toastId) {
          Notification.update({
            id: toastId,
            message: (error as any).message,
            type: 'error',
            autoClose: false
          });
        } else {
          Notification.error((error as any).message);
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
        if (toastId) {
          Notification.update({
            id: toastId,
            message: (error as any).message,
            type: 'error',
            autoClose: false
          });
        } else {
          Notification.error((error as any).message);
        }
      } else {
        if (toastId) {
          Notification.dismiss(toastId);
        }
      }
    }
  }

  async handleExportEnvironment(): Promise<void> {
    try {
      const environmentName = this.state.currentEnvironment;
      if (!environmentName) {
        return;
      }
      const response = await this.props.model.export(environmentName);
      if (response.ok) {
        const content = await response.text();
        const node = document.createElement('div');
        const link = document.createElement('a');
        link.setAttribute(
          'href',
          'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
        );
        link.setAttribute('download', environmentName + '.yml');

        node.style.display = 'none'; // hide the element
        node.appendChild(link);
        document.body.appendChild(node);
        link.click();
        document.body.removeChild(node);
      }
    } catch (error) {
      if (error !== 'cancelled') {
        console.error(error);
        Notification.error((error as any).message);
      }
    }
  }

  async handleRefreshEnvironment(): Promise<void> {
    await this.loadEnvironments();
  }

  async handleRemoveEnvironment(): Promise<void> {
    let toastId = '';
    try {
      const environmentName = this.state.currentEnvironment;
      if (!environmentName) {
        return;
      }
      const response = await showDialog({
        title: 'Remove Environment',
        body: `Are you sure you want to permanently delete environment "${environmentName}" ?`,
        buttons: [
          Dialog.cancelButton(),
          Dialog.okButton({
            caption: 'Delete',
            displayType: 'warn'
          })
        ]
      });
      if (response.button.accept) {
        toastId = Notification.emit(
          `Removing environment ${environmentName}`,
          'in-progress'
        );
        await this.props.model.remove(environmentName);
        Notification.update({
          id: toastId,
          message: `Environment ${environmentName} has been removed.`,
          type: 'success',
          autoClose: 5000
        });
        if (this.state.currentEnvironment === environmentName) {
          this.setState({ currentEnvironment: undefined });
        }
        this.loadEnvironments();
      }
    } catch (error) {
      if (error !== 'cancelled') {
        console.error(error);
        if (toastId) {
          Notification.update({
            id: toastId,
            message: (error as any).message,
            type: 'error',
            autoClose: false
          });
        } else {
          Notification.error((error as any).message);
        }
      } else {
        if (toastId) {
          Notification.dismiss(toastId);
        }
      }
    }
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
      <div className={Style.Panel}>
        <CondaEnvList
          height={this.props.height}
          isPending={this.state.isLoading}
          environments={this.state.environments}
          selected={this.state.currentEnvironment}
          onSelectedChange={this.handleEnvironmentChange}
          onCreate={this.handleCreateEnvironment}
          onClone={this.handleCloneEnvironment}
          onImport={this.handleImportEnvironment}
          onExport={this.handleExportEnvironment}
          onRefresh={this.handleRefreshEnvironment}
          onRemove={this.handleRemoveEnvironment}
        />
        <CondaPkgPanel
          height={this.props.height}
          width={this.props.width - ENVIRONMENT_PANEL_WIDTH}
          packageManager={this.props.model.getPackageManager(
            this.state.currentEnvironment
          )}
        />
      </div>
    );
  }
}

namespace Style {
  export const Panel = style({
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    borderCollapse: 'collapse'
  });
}

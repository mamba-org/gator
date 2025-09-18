/* eslint-disable curly */
import { showDialog, Dialog, Notification } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import * as React from 'react';
import { primePackages } from '../packageActions';
import { style } from 'typestyle';
import { Conda } from '../tokens';
import { CondaPkgList } from './CondaPkgList';
import {
  CondaPkgToolBar,
  PACKAGE_TOOLBAR_HEIGHT,
  PkgFilters
} from './CondaPkgToolBar';
import { PkgGraphWidget } from './PkgGraph';

// Minimal panel width to show package description
const PANEL_SMALL_WIDTH = 500;

/**
 * Package panel property
 */
export interface IPkgPanelProps {
  /**
   * Panel height
   */
  height: number;
  /**
   * Panel width
   */
  width: number;
  /**
   * Package manager for the selected environment
   */
  packageManager: Conda.IPackageManager;
  /**
   * Command registry for menu actions
   */
  commands: CommandRegistry;
  /**
   * Environment name
   */
  envName: string;
}

/**
 * Package panel state
 */
export interface IPkgPanelState {
  /**
   * Optional package manager phase
   */
  phase?: Conda.IPackageUpdate['phase'];
  /**
   * Is package list loading?
   */
  isLoading: boolean;
  /**
   * Is the package manager applying changes?
   */
  isApplyingChanges: boolean;
  /**
   * Does package list have description?
   */
  hasDescription: boolean;
  /**
   * Are there some packages updatable?
   */
  hasUpdate: boolean;
  /**
   * Packages list
   */
  packages: Conda.IPackage[];
  /**
   * Selected packages
   */
  selected: Conda.IPackage[];
  /**
   * Active filter
   */
  activeFilter: PkgFilters;
  /**
   * Current search term
   */
  searchTerm: string;
}

/** Top level React component for widget */
export class CondaPkgPanel extends React.Component<
  IPkgPanelProps,
  IPkgPanelState
> {
  constructor(props: IPkgPanelProps) {
    super(props);
    this.state = {
      isLoading: false,
      isApplyingChanges: false,
      hasDescription: false,
      hasUpdate: false,
      packages: [],
      selected: [],
      searchTerm: '',
      activeFilter: PkgFilters.All,
      phase: undefined
    };

    this._model = this.props.packageManager;

    this.handleCategoryChanged = this.handleCategoryChanged.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleVersionSelection = this.handleVersionSelection.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleUpdateAll = this.handleUpdateAll.bind(this);
    this.handleApply = this.handleApply.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleRefreshPackages = this.handleRefreshPackages.bind(this);
  }

  private _onPkgStateUpdate = (
    manager: Conda.IPackageManager,
    update: Conda.IPackageUpdate
  ): void => {
    if (
      !this._currentEnvironment ||
      update.environment !== this._currentEnvironment
    ) {
      return;
    }

    const next: Partial<IPkgPanelState> = {};

    if (update.phase !== undefined && update.phase !== this.state.phase)
      next.phase = update.phase;
    if (
      update.isLoading !== undefined &&
      update.isLoading !== this.state.isLoading
    )
      next.isLoading = update.isLoading;
    if (
      update.hasUpdate !== undefined &&
      update.hasUpdate !== this.state.hasUpdate
    )
      next.hasUpdate = update.hasUpdate;
    if (
      update.hasDescription !== undefined &&
      update.hasDescription !== this.state.hasDescription
    )
      next.hasDescription = update.hasDescription;
    if (
      update.packages !== undefined &&
      update.packages !== this.state.packages
    )
      next.packages = Array.isArray(update.packages) ? update.packages : [];
    if (
      update.isApplyingChanges !== undefined &&
      update.isApplyingChanges !== this.state.isApplyingChanges
    )
      next.isApplyingChanges = update.isApplyingChanges;
    if (
      update.selected !== undefined &&
      update.selected !== this.state.selected
    )
      next.selected = Array.isArray(update.selected) ? update.selected : [];
    if (
      update.searchTerm !== undefined &&
      update.searchTerm !== this.state.searchTerm
    )
      next.searchTerm = update.searchTerm;
    if (
      update.activeFilter !== undefined &&
      update.activeFilter !== this.state.activeFilter
    )
      next.activeFilter = update.activeFilter;

    if (update.packages) {
      next.packages = Array.isArray(update.packages) ? update.packages : [];
    }
    if (Object.keys(next).length > 0) {
      this.setState(next as IPkgPanelState);
    }
  };

  handleCategoryChanged(event: React.ChangeEvent<HTMLSelectElement>): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    this.setState({
      activeFilter: event.target.value as PkgFilters
    });
  }

  handleClick(pkg: Conda.IPackage): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    const selectIdx = this.state.selected.indexOf(pkg);
    const selection = [...this.state.selected];
    if (selectIdx >= 0) {
      selection.splice(selectIdx, 1);
    }

    if (pkg.version_installed) {
      if (pkg.version_installed === pkg.version_selected) {
        if (pkg.updatable) {
          pkg.version_selected = ''; // Set for update
          selection.push(pkg);
        } else {
          pkg.version_selected = 'none'; // Set for removal
          selection.push(pkg);
        }
      } else {
        if (pkg.version_selected === 'none') {
          pkg.version_selected = pkg.version_installed;
        } else {
          pkg.version_selected = 'none'; // Set for removal
          selection.push(pkg);
        }
      }
    } else {
      if (pkg.version_selected !== 'none') {
        pkg.version_selected = 'none'; // Unselect
      } else {
        pkg.version_selected = ''; // Select 'Any'
        selection.push(pkg);
      }
    }

    this.setState({
      selected: selection
    });
  }

  handleVersionSelection(pkg: Conda.IPackage, version: string): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    const selectIdx = this.state.selected.indexOf(pkg);
    const selection = [...this.state.selected];
    if (selectIdx >= 0) {
      selection.splice(selectIdx, 1);
    }

    if (pkg.version_installed) {
      if (pkg.version_installed !== version) {
        selection.push(pkg);
      }
    } else {
      if (version !== 'none') {
        selection.push(pkg);
      }
    }

    pkg.version_selected = version;

    this.setState({
      selected: selection
    });
  }

  handleDependenciesGraph = (pkg: Conda.IPackage): void => {
    showDialog({
      title: pkg.name,
      body: new PkgGraphWidget(this._model, pkg.name) as any,
      buttons: [Dialog.okButton()]
    });
  };

  handleSearch(event: React.FormEvent): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    this.setState({
      searchTerm: (event.target as HTMLInputElement).value
    });
  }

  async handleUpdateAll(): Promise<void> {
    if (this.state.isApplyingChanges) {
      return;
    }

    let toastId = '';
    try {
      this.setState({
        searchTerm: '',
        activeFilter: PkgFilters.Updatable
      });

      const confirmation = await showDialog({
        title: 'Update all',
        body: 'Please confirm you want to update all packages? Conda enforces environment consistency. So maybe only a subset of the available updates will be applied.'
      });

      if (confirmation.button.accept) {
        this.setState({
          isApplyingChanges: true
        });
        toastId = Notification.emit('Updating packages', 'in-progress');
        await this._model.update(['--all'], this._currentEnvironment);

        Notification.update({
          id: toastId,
          message: 'Package updated successfully.',
          type: 'success',
          autoClose: 5000
        });
      }
    } catch (error) {
      if (error !== 'cancelled') {
        console.error(error);
        if (toastId) {
          Notification.update({
            id: toastId,
            message: (error as any).message,
            type: 'error',
            autoClose: 0
          });
        } else {
          Notification.error((error as any).message);
        }
      } else {
        if (toastId) {
          Notification.dismiss(toastId);
        }
      }
    } finally {
      this.setState({
        isApplyingChanges: false,
        selected: [],
        activeFilter: PkgFilters.All
      });
      primePackages(this._model, this._currentEnvironment);
    }
  }

  /**
   * Execute requested task in the following order
   * 1. Remove packages
   * 2. Apply updates
   * 3. Install new packages
   */
  async handleApply(): Promise<void> {
    if (this.state.isApplyingChanges) {
      return;
    }

    let toastId = '';
    try {
      this.setState({
        searchTerm: '',
        activeFilter: PkgFilters.Selected
      });

      const confirmation = await showDialog({
        title: 'Packages actions',
        body: 'Please confirm you want to apply the selected actions?'
      });

      if (confirmation.button.accept) {
        this.setState({
          isApplyingChanges: true
        });
        toastId = Notification.emit('Starting packages actions', 'in-progress');

        // Get modified pkgs
        const toRemove: Array<string> = [];
        const toUpdate: Array<string> = [];
        const toInstall: Array<string> = [];
        this.state.selected.forEach(pkg => {
          if (pkg.version_installed && pkg.version_selected === 'none') {
            toRemove.push(pkg.name);
          } else if (pkg.updatable && pkg.version_selected === '') {
            toUpdate.push(pkg.name);
          } else {
            toInstall.push(
              pkg.version_selected
                ? pkg.name + '=' + pkg.version_selected
                : pkg.name
            );
          }
        });

        if (toRemove.length > 0) {
          Notification.update({
            id: toastId,
            message: 'Removing selected packages'
          });
          await this._model.remove(toRemove, this._currentEnvironment);
        }

        if (toUpdate.length > 0) {
          Notification.update({
            id: toastId,
            message: 'Updating selected packages'
          });
          await this._model.update(toUpdate, this._currentEnvironment);
        }

        if (toInstall.length > 0) {
          Notification.update({
            id: toastId,
            message: 'Installing new packages'
          });
          await this._model.install(toInstall, this._currentEnvironment);
        }

        Notification.update({
          id: toastId,
          message: 'Package actions successfully done.',
          type: 'success',
          autoClose: 5000
        });
      }
    } catch (error) {
      if (error !== 'cancelled') {
        console.error(error);
        if (toastId) {
          Notification.update({
            id: toastId,
            message: (error as any).message,
            type: 'error',
            autoClose: 0
          });
        } else {
          Notification.error((error as any).message);
        }
      } else {
        if (toastId) {
          Notification.dismiss(toastId);
        }
      }
    } finally {
      this.setState({
        isApplyingChanges: false,
        selected: [],
        activeFilter: PkgFilters.All
      });
      primePackages(this._model, this._currentEnvironment);
    }
  }

  handleCancel(): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    const updatedPackages = this.state.packages.map(pkg => ({
      ...pkg,
      version_selected: pkg.version_installed ? pkg.version_installed : 'none'
    }));

    this.setState({
      packages: updatedPackages,
      selected: []
    });
  }

  async handleRefreshPackages(): Promise<void> {
    try {
      await this._model.refreshAvailablePackages();
    } catch (error) {
      if ((error as any).message !== 'cancelled') {
        console.error('Error when refreshing the available packages.', error);
      }
    }
    primePackages(this._model, this._currentEnvironment);
  }

  componentDidMount(): void {
    this._currentEnvironment = this.props.packageManager.environment ?? '';
    this.props.packageManager.stateUpdateSignal.connect(this._onPkgStateUpdate);
  }

  componentDidUpdate(prevProps: IPkgPanelProps): void {
    if (prevProps.packageManager !== this.props.packageManager) {
      prevProps.packageManager.stateUpdateSignal.disconnect(
        this._onPkgStateUpdate
      );
      this.props.packageManager.stateUpdateSignal.connect(
        this._onPkgStateUpdate
      );
    }

    const nextEnvironment = this.props.packageManager.environment || '';
    if (nextEnvironment && nextEnvironment !== this._currentEnvironment) {
      this._currentEnvironment = nextEnvironment;
      primePackages(this._model, this._currentEnvironment);
    }
  }

  componentWillUnmount(): void {
    this._model.stateUpdateSignal.disconnect(this._onPkgStateUpdate);
  }

  render(): JSX.Element {
    const packages = Array.isArray(this.state.packages)
      ? this.state.packages
      : [];
    const selected = Array.isArray(this.state.selected)
      ? this.state.selected
      : [];

    let filteredPkgs: Conda.IPackage[] = [];
    if (this.state.activeFilter === PkgFilters.All) {
      filteredPkgs = packages;
    } else if (this.state.activeFilter === PkgFilters.Installed) {
      filteredPkgs = packages.filter(pkg => pkg && pkg.version_installed);
    } else if (this.state.activeFilter === PkgFilters.Available) {
      filteredPkgs = packages.filter(pkg => pkg && !pkg.version_installed);
    } else if (this.state.activeFilter === PkgFilters.Updatable) {
      filteredPkgs = packages.filter(pkg => pkg && pkg.updatable);
    } else if (this.state.activeFilter === PkgFilters.Selected) {
      filteredPkgs = packages.filter(pkg => pkg && selected.indexOf(pkg) >= 0);
    }

    let searchPkgs: Conda.IPackage[] = [];
    if (this.state.searchTerm === null || this.state.searchTerm === '') {
      searchPkgs = filteredPkgs;
    } else {
      searchPkgs = filteredPkgs.filter(pkg => {
        if (!pkg || !pkg.name) return false;

        const lowerSearch = this.state.searchTerm.toLowerCase();
        return (
          pkg.name.indexOf(this.state.searchTerm) >= 0 ||
          (this.state.hasDescription &&
            pkg.summary &&
            pkg.keywords &&
            pkg.tags &&
            (pkg.summary.indexOf(this.state.searchTerm) >= 0 ||
              pkg.keywords.indexOf(lowerSearch) >= 0 ||
              pkg.tags.indexOf(lowerSearch) >= 0))
        );
      });
    }

    return (
      <div className={Style.Panel}>
        <CondaPkgToolBar
          isPending={this.state.isLoading}
          category={this.state.activeFilter}
          hasSelection={this.state.selected.length > 0}
          hasUpdate={this.state.hasUpdate}
          searchTerm={this.state.searchTerm}
          onCategoryChanged={this.handleCategoryChanged}
          onSearch={this.handleSearch}
          onUpdateAll={this.handleUpdateAll}
          onApply={this.handleApply}
          onCancel={this.handleCancel}
          onRefreshPackages={this.handleRefreshPackages}
        />
        <div
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <CondaPkgList
            height={this.props.height - PACKAGE_TOOLBAR_HEIGHT}
            hasDescription={
              this.state.hasDescription && this.props.width > PANEL_SMALL_WIDTH
            }
            packages={searchPkgs}
            onPkgClick={this.handleClick}
            onPkgChange={this.handleVersionSelection}
            onPkgGraph={this.handleDependenciesGraph}
            commands={this.props.commands}
            envName={this.props.envName}
          />
        </div>
      </div>
    );
  }

  private _model: Conda.IPackageManager;
  private _currentEnvironment = '';
}

namespace Style {
  export const Panel = style({
    flexGrow: 1,
    borderLeft: '1px solid var(--jp-border-color2)'
  });
}

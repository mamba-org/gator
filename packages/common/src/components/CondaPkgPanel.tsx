import { showDialog, Dialog, Notification } from '@jupyterlab/apputils';
import * as React from 'react';
import semver from 'semver';
import { style } from 'typestyle';
import { Conda } from '../tokens';
import { CondaPkgList } from './CondaPkgList';
import {
  CondaPkgToolBar,
  PACKAGE_TOOLBAR_HEIGHT,
  PkgFilters
} from './CondaPkgToolBar';
import { PkgGraphWidget } from './PkgGraph';
import {
  updateAllPackages,
  applyPackageChanges,
  refreshAvailablePackages as refreshAvailablePkgs
} from '../packageActions';

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
   * Current environment name
   */
  environmentName?: string;
  /**
   * Package loading state
   */
  isPackageLoading?: boolean;
}

/**
 * Package panel state
 */
export interface IPkgPanelState {
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
      activeFilter: PkgFilters.Installed
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

  private async _updatePackages(): Promise<void> {
    const environmentName = this._currentEnvironment || this._model.environment;
    if (!environmentName) {
      return;
    }

    this.setState({
      isLoading: true,
      hasUpdate: false,
      packages: [],
      selected: []
    });

    try {
      const environmentLoading =
        this._currentEnvironment || this._model.environment;
      // Get installed packages
      const packages = await this._model.refresh(false, environmentLoading);
      this.setState({
        packages: packages
      });

      const available = await this._model.refresh(true, environmentLoading);

      let hasUpdate = false;
      available.forEach((pkg: Conda.IPackage, index: number) => {
        try {
          if (
            pkg.version_installed &&
            semver.gt(
              semver.coerce(pkg.version[pkg.version.length - 1]),
              semver.coerce(pkg.version_installed)
            )
          ) {
            available[index].updatable = true;
            hasUpdate = true;
          }
        } catch (error) {
          console.debug(
            `Error when testing updatable status for ${pkg.name}`,
            error
          );
        }
      });

      this.setState({
        isLoading: false,
        hasDescription: this._model.hasDescription(),
        packages: available,
        hasUpdate
      });
    } catch (error) {
      if ((error as any).message !== 'cancelled') {
        this.setState({
          isLoading: false
        });
        console.error(error);

        Notification.update({
          id: 'loading-packages-error',
          message: `Failed to load packages for ${environmentName}`,
          type: 'error',
          autoClose: 0
        });
      }
    }
  }

  /**
   * Cancel package changes (reset selection state)
   *
   * @param selectedPackages List of packages with pending changes
   */
  private _cancelPackageChanges(selectedPackages: Conda.IPackage[]): void {
    selectedPackages.forEach(
      pkg =>
        (pkg.version_selected = pkg.version_installed
          ? pkg.version_installed
          : 'none')
    );
  }

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
    const selection = this.state.selected;
    if (selectIdx >= 0) {
      this.state.selected.splice(selectIdx, 1);
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
      packages: this.state.packages,
      selected: selection
    });
  }

  handleVersionSelection(pkg: Conda.IPackage, version: string): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    const selectIdx = this.state.selected.indexOf(pkg);
    const selection = this.state.selected;
    if (selectIdx >= 0) {
      this.state.selected.splice(selectIdx, 1);
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
      packages: this.state.packages,
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

    try {
      this.setState({
        searchTerm: '',
        activeFilter: PkgFilters.Updatable,
        isApplyingChanges: true
      });

      await updateAllPackages(this._model, this._currentEnvironment);
    } finally {
      this.setState({
        isApplyingChanges: false,
        selected: [],
        activeFilter: PkgFilters.Installed
      });
      this._updatePackages();
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

    try {
      this.setState({
        searchTerm: '',
        activeFilter: PkgFilters.Selected,
        isApplyingChanges: true
      });

      await applyPackageChanges(
        this._model,
        this.state.selected,
        this._currentEnvironment
      );
    } finally {
      this.setState({
        isApplyingChanges: false,
        selected: [],
        activeFilter: PkgFilters.Installed
      });
      this._updatePackages();
    }
  }

  handleCancel(): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    this._cancelPackageChanges(this.state.selected);

    this.setState({
      selected: []
    });
  }

  async handleRefreshPackages(): Promise<void> {
    try {
      await refreshAvailablePkgs(this._model, this._currentEnvironment);
    } finally {
      this._updatePackages();
    }
  }

  componentDidUpdate(prevProps: IPkgPanelProps): void {
    if (this._currentEnvironment !== this.props.packageManager.environment) {
      this._currentEnvironment = this.props.packageManager.environment;
      this._updatePackages();
    }

    if (prevProps.isPackageLoading !== this.props.isPackageLoading) {
      if (
        this.props.isPackageLoading === false &&
        prevProps.isPackageLoading === true
      ) {
        this._updatePackages();
      }
    }
  }

  render(): JSX.Element {
    let filteredPkgs: Conda.IPackage[] = [];
    if (this.state.activeFilter === PkgFilters.Installed) {
      filteredPkgs = this.state.packages.filter(pkg => pkg.version_installed);
    } else if (this.state.activeFilter === PkgFilters.Available) {
      filteredPkgs = this.state.packages.filter(pkg => !pkg.version_installed);
    } else if (this.state.activeFilter === PkgFilters.Updatable) {
      filteredPkgs = this.state.packages.filter(pkg => pkg.updatable);
    } else if (this.state.activeFilter === PkgFilters.Selected) {
      filteredPkgs = this.state.packages.filter(
        pkg => this.state.selected.indexOf(pkg) >= 0
      );
    }

    let searchPkgs: Conda.IPackage[] = [];
    if (this.state.searchTerm === null) {
      searchPkgs = filteredPkgs;
    } else {
      searchPkgs = filteredPkgs.filter(pkg => {
        const lowerSearch = this.state.searchTerm.toLowerCase();
        return (
          pkg.name.indexOf(this.state.searchTerm) >= 0 ||
          (this.state.hasDescription &&
            (pkg.summary.indexOf(this.state.searchTerm) >= 0 ||
              pkg.keywords.indexOf(lowerSearch) >= 0 ||
              pkg.tags.indexOf(lowerSearch) >= 0))
        );
      });
    }

    return (
      <div className={Style.PackagePanel}>
        <CondaPkgToolBar
          isPending={
            this.props.isPackageLoading !== undefined
              ? this.props.isPackageLoading
              : this.state.isLoading
          }
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
          style={{
            display: 'flex',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <CondaPkgList
            height={this.props.height - PACKAGE_TOOLBAR_HEIGHT}
            hasDescription={
              this.state.hasDescription && this.props.width > PANEL_SMALL_WIDTH
            }
            packages={searchPkgs}
            isLoading={this.state.isLoading}
            onPkgClick={this.handleClick}
            onPkgChange={this.handleVersionSelection}
            onPkgGraph={this.handleDependenciesGraph}
          />
        </div>
      </div>
    );
  }

  private _model: Conda.IPackageManager;
  private _currentEnvironment = '';
}

namespace Style {
  export const PackagePanel = style({
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flex: '1 1 auto',
    overflow: 'hidden',
    borderLeft: '1px solid var(--jp-border-color2)'
  });
}

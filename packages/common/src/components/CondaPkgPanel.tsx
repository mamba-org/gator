import { CommandRegistry } from '@lumino/commands';
import { showDialog, Dialog, Notification } from '@jupyterlab/apputils';
import * as React from 'react';
import semver from 'semver';
import { style } from 'typestyle';
import { Conda } from '../tokens';
import { CondaPkgList } from './CondaPkgList';
import { CondaPkgDrawer } from './CondaPkgDrawer';
import {
  CondaPkgToolBar,
  PACKAGE_TOOLBAR_HEIGHT,
  PkgFilters
} from './CondaPkgToolBar';
import { PkgGraphWidget } from './PkgGraph';
import {
  updateAllPackages,
  applyPackageChanges,
  refreshAvailablePackages as refreshAvailablePkgs,
  deletePackages
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
  /**
   * Command registry
   */
  commands?: CommandRegistry;
  /**
   * Whether to use direct package actions (immediate update on version change)
   */
  useDirectPackageActions?: boolean;
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
  /**
   * Is the package drawer open?
   */
  isDrawerOpen: boolean;
  /**
   * Whether to use direct package actions (immediate update on version change)
   */
  useDirectPackageActions: boolean;
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
      activeFilter: PkgFilters.Installed,
      isDrawerOpen: false,
      useDirectPackageActions: props.useDirectPackageActions ?? true
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
    this.handleDeleteSelected = this.handleDeleteSelected.bind(this);

    this.handleCloseDrawer = this.handleCloseDrawer.bind(this);
    this.handleAddPackages = this.handleAddPackages.bind(this);
    this.handlePackagesInstalled = this.handlePackagesInstalled.bind(this);
    this.handleToggleDirectActions = this.handleToggleDirectActions.bind(this);
    this._model.packageChanged.connect(this.handlePackageChanged);
  }

  handlePackagesInstalled(): void {
    this._updatePackages();
  }

  handlePackageChanged = (
    _: Conda.IPackageManager,
    change: Conda.IPackageChange
  ): void => {
    // Refresh packages when they're modified
    if (['remove', 'update', 'install'].includes(change.type)) {
      this._updatePackages();
    }
  };

  handleCloseDrawer(): void {
    this.setState({
      isDrawerOpen: false
    });
  }

  handleAddPackages(): void {
    this.setState({
      isDrawerOpen: true
    });
  }

  handleToggleDirectActions(): void {
    // Clear any pending selections when switching modes
    const newPackages = this._cancelPackageChanges(this.state.selected);
    this.setState(prevState => ({
      useDirectPackageActions: !prevState.useDirectPackageActions,
      packages: newPackages,
      selected: [] as Conda.IPackage[]
    }));
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
              semver.coerce(pkg.version[0]),
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
        console.error(error);
        Notification.error(`Failed to load packages for ${environmentName}`);
      }
    } finally {
      this.setState({
        isLoading: false
      });
    }
  }

  /**
   * Cancel package changes (reset selection state)
   *
   * @param selectedPackages List of packages with pending changes
   * @returns New packages array with reset version_selected values
   */
  private _cancelPackageChanges(
    selectedPackages: Conda.IPackage[]
  ): Conda.IPackage[] {
    const newPackages = this.state.packages.map(pkg => {
      if (selectedPackages.includes(pkg)) {
        return {
          ...pkg,
          version_selected: pkg.version_installed
            ? pkg.version_installed
            : 'none'
        };
      }
      return pkg;
    });
    return newPackages;
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

    const useDirectActions = this.state.useDirectPackageActions;
    const pkgIndex = this.state.packages.indexOf(pkg);

    if (useDirectActions) {
      const selectIdx = this.state.selected.indexOf(pkg);
      const selection = [...this.state.selected];
      const wasSelected = selectIdx >= 0;

      if (wasSelected) {
        selection.splice(selectIdx, 1);
      }

      let newVersionSelected: string;
      if (pkg.version_installed) {
        // Toggle update selection
        if (wasSelected) {
          newVersionSelected = pkg.version_installed; // Reset to current version
        } else {
          newVersionSelected = ''; // Empty string = unpinned update
        }
      } else {
        if (pkg.version_selected !== 'none') {
          newVersionSelected = 'none'; // Unselect
        } else {
          newVersionSelected = ''; // Select 'Any' (unpinned install)
        }
      }

      const updatedPkg = { ...pkg, version_selected: newVersionSelected };

      // Update selection array with the new package reference
      if (
        !wasSelected &&
        (pkg.version_installed || newVersionSelected !== 'none')
      ) {
        selection.push(updatedPkg);
      }

      const newPackages = [...this.state.packages];
      newPackages[pkgIndex] = updatedPkg;

      this.setState({
        packages: newPackages,
        selected: selection
      });
    } else {
      const selectIdx = this.state.selected.indexOf(pkg);
      const selection = [...this.state.selected];
      if (selectIdx >= 0) {
        selection.splice(selectIdx, 1);
      }

      let newVersionSelected: string;
      if (pkg.version_installed) {
        if (pkg.version_installed === pkg.version_selected) {
          if (pkg.updatable) {
            newVersionSelected = ''; // Set for update
          } else {
            newVersionSelected = 'none'; // Set for removal
          }
        } else {
          if (pkg.version_selected === 'none') {
            newVersionSelected = pkg.version_installed;
          } else {
            newVersionSelected = 'none'; // Set for removal
          }
        }
      } else {
        if (pkg.version_selected !== 'none') {
          newVersionSelected = 'none'; // Unselect
        } else {
          newVersionSelected = ''; // Select 'Any'
        }
      }

      const updatedPkg = { ...pkg, version_selected: newVersionSelected };

      // Update selection array with the new package reference *if needed*
      const shouldSelect =
        (pkg.version_installed &&
          newVersionSelected !== pkg.version_installed) ||
        (!pkg.version_installed && newVersionSelected !== 'none');
      if (shouldSelect) {
        selection.push(updatedPkg);
      }

      const newPackages = [...this.state.packages];
      newPackages[pkgIndex] = updatedPkg;

      this.setState({
        packages: newPackages,
        selected: selection
      });
    }
  }

  async handleVersionSelection(
    pkg: Conda.IPackage,
    version: string
  ): Promise<void> {
    if (this.state.isApplyingChanges) {
      return;
    }

    const useDirectActions = this.state.useDirectPackageActions;
    const pkgIndex = this.state.packages.indexOf(pkg);

    if (pkg.version_installed) {
      if (useDirectActions) {
        if (pkg.version_installed !== version) {
          this.props.commands?.execute('gator-lab:update-pkg', {
            name: pkg.name,
            environment: this._currentEnvironment,
            version: version === 'auto' ? '' : version
          });
        }
      } else {
        const selectIdx = this.state.selected.indexOf(pkg);
        const selection = [...this.state.selected];
        if (selectIdx >= 0) {
          selection.splice(selectIdx, 1);
        }

        const updatedPkg = { ...pkg, version_selected: version };

        if (pkg.version_installed !== version) {
          selection.push(updatedPkg);
        }

        const newPackages = [...this.state.packages];
        newPackages[pkgIndex] = updatedPkg;

        this.setState({
          packages: newPackages,
          selected: selection
        });
      }
    } else {
      const selectIdx = this.state.selected.indexOf(pkg);
      const selection = [...this.state.selected];
      if (selectIdx >= 0) {
        selection.splice(selectIdx, 1);
      }

      const updatedPkg = { ...pkg, version_selected: version };

      if (version !== 'none') {
        selection.push(updatedPkg);
      }

      const newPackages = [...this.state.packages];
      newPackages[pkgIndex] = updatedPkg;

      this.setState({
        packages: newPackages,
        selected: selection
      });
    }
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

    // TODO: Handle the case where the user cancels the update: show a notification here rather than in the packageActions.ts file
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

    // TODO: Handle the case where the user cancels the modifications: show a notification here rather than in the packageActions.ts file
    try {
      this.setState({
        searchTerm: '',
        activeFilter: PkgFilters.Selected,
        isApplyingChanges: true
      });

      const wasApplied = await applyPackageChanges(
        this._model,
        this.state.selected,
        this._currentEnvironment
      );

      if (wasApplied) {
        this.setState({
          isApplyingChanges: false,
          selected: [],
          activeFilter: PkgFilters.Installed
        });
      } else {
        // User cancelled, keep the selections
        this.setState({
          isApplyingChanges: false,
          activeFilter: PkgFilters.Installed
        });
      }
    } catch (error) {
      this.setState({
        isApplyingChanges: false,
        activeFilter: PkgFilters.Installed
      });
    }
  }

  async handleDeleteSelected(): Promise<void> {
    if (this.state.isApplyingChanges) {
      return;
    }

    try {
      this.setState({
        isApplyingChanges: true
      });

      await deletePackages(
        this._model,
        this.state.selected.map(pkg => pkg.name),
        this._currentEnvironment
      );
    } finally {
      this.setState({
        isApplyingChanges: false
      });
    }
  }
  handleCancel(): void {
    if (this.state.isApplyingChanges) {
      return;
    }

    const newPackages = this._cancelPackageChanges(this.state.selected);

    this.setState({
      packages: newPackages,
      selected: []
    });
  }

  async handleRefreshPackages(): Promise<void> {
    if (this.state.isApplyingChanges) {
      return;
    }

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

  componentWillUnmount(): void {
    this._model.packageChanged.disconnect(this.handlePackageChanged);
  }

  render(): JSX.Element {
    let filteredPkgs: Conda.IPackage[] = [];
    if (this.state.activeFilter === PkgFilters.Installed) {
      filteredPkgs = this.state.packages.filter(pkg => pkg.version_installed);
    } else if (this.state.activeFilter === PkgFilters.Updatable) {
      filteredPkgs = this.state.packages.filter(pkg => pkg.updatable);
    } else if (this.state.activeFilter === PkgFilters.Selected) {
      filteredPkgs = this.state.packages.filter(
        pkg => this.state.selected.indexOf(pkg) >= 0
      );
    }

    const uninstalledPkgs: Conda.IPackage[] = this.state.packages.filter(
      (pkg: Conda.IPackage) => !pkg.version_installed
    );

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
          onAddPackages={this.handleAddPackages}
          onDeleteSelected={this.handleDeleteSelected}
          useDirectPackageActions={this.state.useDirectPackageActions}
          onToggleDirectActions={this.handleToggleDirectActions}
        />
        <div
          style={{
            display: 'flex',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {/* Show drawer for adding packages or default list viewing installed packages */}
          {this.state.isDrawerOpen ? (
            <CondaPkgDrawer
              pkgModel={this._model}
              envName={this._currentEnvironment}
              height={this.props.height - PACKAGE_TOOLBAR_HEIGHT}
              hasDescription={
                this.state.hasDescription &&
                this.props.width > PANEL_SMALL_WIDTH
              }
              packages={uninstalledPkgs}
              isLoading={this.state.isLoading}
              onPkgClick={this.handleClick}
              onPkgGraph={this.handleDependenciesGraph}
              onClose={this.handleCloseDrawer}
              onPackagesInstalled={this.handlePackagesInstalled}
            />
          ) : (
            <CondaPkgList
              height={this.props.height - PACKAGE_TOOLBAR_HEIGHT}
              hasDescription={
                this.state.hasDescription &&
                this.props.width > PANEL_SMALL_WIDTH
              }
              packages={searchPkgs}
              isLoading={this.state.isLoading}
              onPkgClick={this.handleClick}
              onPkgChange={this.handleVersionSelection}
              onPkgGraph={this.handleDependenciesGraph}
              commands={this.props.commands}
              envName={this._currentEnvironment}
              useDirectPackageActions={this.state.useDirectPackageActions}
            />
          )}
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

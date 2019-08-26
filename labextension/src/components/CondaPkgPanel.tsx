import { showDialog } from "@jupyterlab/apputils";
import { INotification } from "jupyterlab_toastify";
import * as React from "react";
import { style } from "typestyle";
import { Conda, CondaPackage } from "../services";
import { CondaPkgList } from "./CondaPkgList";
import { CondaPkgToolBar, PkgFilters } from "./CondaPkgToolBar";

// Minimal panel width to show package description
const PANEL_SMALL_WIDTH: number = 500;

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
   * Selected environment name
   */
  environment: string;
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
   * Does the package list needs to be updated?
   */
  needsReload: boolean;
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
      needsReload: false,
      isApplyingChanges: false,
      hasDescription: false,
      hasUpdate: false,
      packages: [],
      selected: [],
      searchTerm: "",
      activeFilter: PkgFilters.All
    };

    this._model = new CondaPackage(this.props.environment);

    this.handleCategoryChanged = this.handleCategoryChanged.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleVersionSelection = this.handleVersionSelection.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleUpdateAll = this.handleUpdateAll.bind(this);
    this.handleApply = this.handleApply.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleRefreshPackages = this.handleRefreshPackages.bind(this);
  }

  private async _updatePackages() {
    function cancel(self: CondaPkgPanel) {
      self.setState({
        isLoading: false,
        hasUpdate: false,
        packages: [],
        selected: []
      });
      self._updatePackages();
    }

    if (!this.state.isLoading) {
      this.setState({
        isLoading: true,
        needsReload: false
      });
      try {
        let environmentLoading = this._model.environment;
        // Get installed packages
        let packages = await this._model.refresh(false);
        // If current environment changes when waiting for the packages
        if (
          this._model.environment !== environmentLoading ||
          this.state.needsReload
        ) {
          return cancel(this);
        }
        this.setState({
          packages: packages
        });

        // Now get the updatable packages
        let data = await this._model.check_updates();
        // If current environment changes when waiting for the update status
        if (
          this._model.environment !== environmentLoading ||
          this.state.needsReload
        ) {
          return cancel(this);
        }

        let hasUpdate = false;
        this.state.packages.forEach((pkg: Conda.IPackage, index: number) => {
          if (data.indexOf(pkg.name) >= 0 && pkg.version_installed) {
            this.state.packages[index].updatable = true;
            hasUpdate = true;
          }
        });
        this.setState({
          packages: this.state.packages,
          hasUpdate
        });

        let available = await this._model.refresh();
        // If current environment changes when waiting for the available package
        if (
          this._model.environment !== environmentLoading ||
          this.state.needsReload
        ) {
          return cancel(this);
        }

        available.forEach((pkg: Conda.IPackage, index: number) => {
          if (data.indexOf(pkg.name) >= 0 && pkg.version_installed) {
            available[index].updatable = true;
          }
        });

        this.setState({
          isLoading: false,
          hasDescription: this._model.hasDescription(),
          packages: available
        });
      } catch (error) {
        this.setState({
          isLoading: false
        });
        console.error(error);
        INotification.error(error.message);
      }
    }
  }

  handleCategoryChanged(event: React.ChangeEvent<HTMLSelectElement>) {
    if (this.state.isApplyingChanges) {
      return;
    }

    this.setState({
      activeFilter: event.target.value as PkgFilters
    });
  }

  handleClick(pkg: Conda.IPackage) {
    if (this.state.isApplyingChanges) {
      return;
    }

    const selectIdx = this.state.selected.indexOf(pkg);
    let selection = this.state.selected;
    if (selectIdx >= 0) {
      this.state.selected.splice(selectIdx, 1);
    }

    if (pkg.version_installed) {
      if (pkg.version_installed === pkg.version_selected) {
        if (pkg.updatable) {
          pkg.version_selected = ""; // Set for update
          selection.push(pkg);
        } else {
          pkg.version_selected = "none"; // Set for removal
          selection.push(pkg);
        }
      } else {
        if (pkg.version_selected === "none") {
          pkg.version_selected = pkg.version_installed;
        } else {
          pkg.version_selected = "none"; // Set for removal
          selection.push(pkg);
        }
      }
    } else {
      if (pkg.version_selected !== "none") {
        pkg.version_selected = "none"; // Unselect
      } else {
        pkg.version_selected = ""; // Select 'Any'
        selection.push(pkg);
      }
    }

    this.setState({
      packages: this.state.packages,
      selected: selection
    });
  }

  handleVersionSelection(pkg: Conda.IPackage, version: string) {
    if (this.state.isApplyingChanges) {
      return;
    }

    const selectIdx = this.state.selected.indexOf(pkg);
    let selection = this.state.selected;
    if (selectIdx >= 0) {
      this.state.selected.splice(selectIdx, 1);
    }

    if (pkg.version_installed) {
      if (pkg.version_installed !== version) {
        selection.push(pkg);
      }
    } else {
      if (version !== "none") {
        selection.push(pkg);
      }
    }

    pkg.version_selected = version;

    this.setState({
      packages: this.state.packages,
      selected: selection
    });
  }

  handleSearch(event: any) {
    if (this.state.isApplyingChanges) {
      return;
    }

    this.setState({
      searchTerm: event.target.value
    });
  }

  async handleUpdateAll() {
    if (this.state.isApplyingChanges) {
      return;
    }

    let toastId = null;
    try {
      this.setState({
        searchTerm: "",
        activeFilter: PkgFilters.Updatable
      });

      let confirmation = await showDialog({
        title: "Update all",
        body: "Please confirm you want to update all packages?"
      });

      if (confirmation.button.accept) {
        this.setState({
          isApplyingChanges: true
        });
        toastId = INotification.inProgress("Updating packages");
        await this._model.update(["--all"]);

        INotification.update({
          toastId: toastId,
          message: "Package updated successfully.",
          type: "success",
          autoClose: 5000,
          buttons: []
        });
      }
    } catch (error) {
      console.error(error);
      if (toastId) {
        INotification.update({
          toastId: toastId,
          message: error.message,
          type: "error",
          autoClose: 0,
          buttons: []
        });
      } else {
        toastId = INotification.error(error.message);
      }
    } finally {
      this.setState({
        needsReload: true, // For packages reload if loading is still in progress
        isApplyingChanges: false,
        selected: [],
        activeFilter: PkgFilters.All
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
  async handleApply() {
    if (this.state.isApplyingChanges) {
      return;
    }

    let toastId = null;
    try {
      this.setState({
        searchTerm: "",
        activeFilter: PkgFilters.Selected
      });

      let confirmation = await showDialog({
        title: "Packages actions",
        body: "Please confirm you want to apply the selected actions?"
      });

      if (confirmation.button.accept) {
        this.setState({
          isApplyingChanges: true
        });
        toastId = INotification.inProgress("Starting packages actions");

        // Get modified pkgs
        const to_remove: Array<string> = [];
        const to_update: Array<string> = [];
        const to_install: Array<string> = [];
        this.state.selected.forEach(pkg => {
          if (pkg.version_installed && pkg.version_selected === "none") {
            to_remove.push(pkg.name);
          } else if (pkg.updatable && pkg.version_selected === "") {
            to_update.push(pkg.name);
          } else {
            to_install.push(
              pkg.version_selected
                ? pkg.name + "=" + pkg.version_selected
                : pkg.name
            );
          }
        });

        if (to_remove.length > 0) {
          INotification.update({
            toastId: toastId,
            message: "Removing selected packages",
            buttons: []
          });
          await this._model.remove(to_remove);
        }

        if (to_update.length > 0) {
          INotification.update({
            toastId: toastId,
            message: "Updating selected packages",
            buttons: []
          });
          await this._model.update(to_update);
        }

        if (to_install.length > 0) {
          INotification.update({
            toastId: toastId,
            message: "Installing new packages",
            buttons: []
          });
          await this._model.install(to_install);
        }

        INotification.update({
          toastId: toastId,
          message: "Package actions successfully done.",
          type: "success",
          autoClose: 5000,
          buttons: []
        });
      }
    } catch (error) {
      console.error(error);
      if (toastId) {
        INotification.update({
          toastId: toastId,
          message: error.message,
          type: "error",
          autoClose: 0,
          buttons: []
        });
      } else {
        toastId = INotification.error(error.message);
      }
    } finally {
      this.setState({
        needsReload: true, // For packages reload if loading is still in progress
        isApplyingChanges: false,
        selected: [],
        activeFilter: PkgFilters.All
      });
      this._updatePackages();
    }
  }

  handleCancel() {
    if (this.state.isApplyingChanges) {
      return;
    }

    this.state.selected.forEach(
      pkg =>
        (pkg.version_selected = pkg.version_installed
          ? pkg.version_installed
          : "none")
    );

    this.setState({
      selected: []
    });
  }

  async handleRefreshPackages() {
    await this._model.refreshAvailablePackages();
    this._updatePackages();
  }

  componentDidUpdate(prevProps: IPkgPanelProps) {
    if (prevProps.environment !== this.props.environment) {
      this._model = new CondaPackage(this.props.environment);
      this.setState({
        isLoading: false,
        packages: [],
        selected: []
      });
      this._updatePackages();
    }
  }

  render() {
    let filteredPkgs: Conda.IPackage[] = [];
    if (this.state.activeFilter === PkgFilters.All) {
      filteredPkgs = this.state.packages;
    } else if (this.state.activeFilter === PkgFilters.Installed) {
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
        <CondaPkgList
          height={this.props.height - 40} // Remove height for toolbar
          hasDescription={
            this.state.hasDescription && this.props.width > PANEL_SMALL_WIDTH
          }
          packages={searchPkgs}
          onPkgClick={this.handleClick}
          onPkgChange={this.handleVersionSelection}
        />
      </div>
    );
  }

  private _model: Conda.IPackageManager;
}

namespace Style {
  export const Panel = style({
    flexGrow: 1,
    borderLeft: "1px solid var(--jp-border-color2)"
  });
}

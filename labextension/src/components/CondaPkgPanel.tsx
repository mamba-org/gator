import * as React from "react";
// TODO to be more generic CondaPackage should not be used explicitly
// but it should be obtained from getPackageService method of IEnvironmentsService
import { Conda, CondaPackage } from "../services";
import { CondaPkgList, TitleItem } from "./CondaPkgList";
import { CondaPkgToolBar, PkgFilters } from "./CondaPkgToolBar";
import { showDialog } from "@jupyterlab/apputils";
import { style } from "typestyle";
import { INotification } from "jupyterlab_toastify";

/**
 * Package panel property
 */
export interface IPkgPanelProps {
  /**
   * Panel height
   */
  height: number;
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
   * Packages list
   */
  packages: Conda.IPackage[];
  /**
   * Selected packages
   */
  selected: Array<{ index: number; status: Conda.PkgStatus }>;
  /**
   * Active filter
   */
  activeFilter: PkgFilters;
  /**
   * Current search term
   */
  searchTerm: string;
  /**
   * Field used for sorting the list
   */
  sortedField: TitleItem.SortField;
  /**
   * Sort direction
   */
  sortDirection: TitleItem.SortStatus;
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
      packages: [],
      selected: [],
      searchTerm: "",
      activeFilter: PkgFilters.All,
      sortedField: TitleItem.SortField.Name,
      sortDirection: TitleItem.SortStatus.Down
    };

    this._model = new CondaPackage(this.props.environment);

    this.handleCategoryChanged = this.handleCategoryChanged.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleApply = this.handleApply.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleSort = this.handleSort.bind(this);
  }

  private async _updatePackages() {
    function cancel(self: CondaPkgPanel) {
      self.setState({
        isLoading: false,
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
        let packages = await this._model.refresh();
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

        this.state.packages.forEach((pkg: Conda.IPackage, index: number) => {
          if (
            data.indexOf(pkg.name) >= 0 &&
            pkg.status === Conda.PkgStatus.Installed
          ) {
            this.state.packages[index].updatable = true;
          }
        });
        this.setState({
          packages: this.state.packages
        });

        let available = await this._model.refresh(Conda.PkgStatus.Available);
        // If current environment changes when waiting for the available package
        if (
          this._model.environment !== environmentLoading ||
          this.state.needsReload
        ) {
          return cancel(this);
        }

        available.forEach((pkg: Conda.IPackage, index: number) => {
          if (
            data.indexOf(pkg.name) >= 0 &&
            pkg.status === Conda.PkgStatus.Installed
          ) {
            available[index].updatable = true;
          }
        });

        this.setState({
          isLoading: false,
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

  handleCategoryChanged(event: any) {
    if (this.state.isApplyingChanges) {
      return;
    }

    this.setState({
      activeFilter: event.target.value
    });
  }

  handleClick(index: number) {
    if (this.state.isApplyingChanges) {
      return;
    }

    let clicked = this.state.packages[index];
    let selection = this.state.selected;
    let found = false;
    for (let selectIdx = 0; selectIdx < selection.length; ++selectIdx) {
      if (selection[selectIdx].index === index) {
        found = true;
        if (clicked.status === Conda.PkgStatus.Installed) {
          if (selection[selectIdx].status === Conda.PkgStatus.Update) {
            selection[selectIdx].status = Conda.PkgStatus.Remove;
          } else {
            selection = selection.splice(selectIdx, 1);
          }
        } else if (clicked.status === Conda.PkgStatus.Available) {
          selection = selection.splice(selectIdx, 1);
        }

        break;
      }
    }

    if (!found) {
      if (clicked.status === Conda.PkgStatus.Installed) {
        if (clicked.updatable) {
          selection.push({ index, status: Conda.PkgStatus.Update });
        } else {
          selection.push({ index, status: Conda.PkgStatus.Remove });
        }
      } else if (clicked.status === Conda.PkgStatus.Available) {
        selection.push({ index, status: Conda.PkgStatus.Installed });
      }
    }

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
        let pkgs = this.state.selected
          .filter(selection => selection.status === Conda.PkgStatus.Remove)
          .map(selection => this.state.packages[selection.index].name);
        if (pkgs.length > 0) {
          INotification.update({
            toastId: toastId,
            message: "Removing selected packages",
            buttons: []
          });
          await this._model.remove(pkgs);
        }
        pkgs = this.state.selected
          .filter(selection => selection.status === Conda.PkgStatus.Update)
          .map(selection => this.state.packages[selection.index].name);
        if (pkgs.length > 0) {
          INotification.update({
            toastId: toastId,
            message: "Updating selected packages",
            buttons: []
          });
          await this._model.update(pkgs);
        }
        pkgs = this.state.selected
          .filter(selection => selection.status === Conda.PkgStatus.Installed)
          .map(selection => this.state.packages[selection.index].name);
        if (pkgs.length > 0) {
          INotification.update({
            toastId: toastId,
            message: "Installing new packages",
            buttons: []
          });
          await this._model.install(pkgs);
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

    this.setState({
      selected: []
    });
  }

  handleSort(field: TitleItem.SortField, status: TitleItem.SortStatus) {
    // TODO
    if (this.state.isApplyingChanges) {
      return;
    }
  }

  componentDidUpdate(prevProps: IPkgPanelProps) {
    if (prevProps.environment !== this.props.environment) {
      this._model = new CondaPackage(this.props.environment);
      this.setState({
        isLoading: false,
        packages: []
      });
      this._updatePackages();
    }
  }

  render() {
    let filteredPkgs: Conda.IPackage[] = [];
    if (this.state.activeFilter === PkgFilters.All) {
      filteredPkgs = this.state.packages;
    } else if (this.state.activeFilter === PkgFilters.Installed) {
      this.state.packages.forEach(pkg => {
        if (pkg.status === Conda.PkgStatus.Installed) {
          filteredPkgs.push(pkg);
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Available) {
      this.state.packages.forEach(pkg => {
        if (pkg.status === Conda.PkgStatus.Available) {
          filteredPkgs.push(pkg);
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Updatable) {
      this.state.packages.forEach(pkg => {
        if (pkg.updatable) {
          filteredPkgs.push(pkg);
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Selected) {
      this.state.selected.forEach(selection => {
        filteredPkgs.push(this.state.packages[selection.index]);
      });
    }

    let searchPkgs: Conda.IPackage[] = [];
    if (this.state.searchTerm === null) {
      searchPkgs = filteredPkgs;
    } else {
      Object.keys(filteredPkgs).forEach(name => {
        if (name.indexOf(this.state.searchTerm) > -1) {
          searchPkgs[name] = filteredPkgs[name];
        }
      });
    }

    return (
      <div className={Style.Panel}>
        <CondaPkgToolBar
          category={this.state.activeFilter}
          hasSelection={Object.keys(this.state.selected).length > 0}
          searchTerm={this.state.searchTerm}
          onCategoryChanged={this.handleCategoryChanged}
          onSearch={this.handleSearch}
          onApply={this.handleApply}
          onCancel={this.handleCancel}
        />
        <CondaPkgList
          height={this.props.height - 29} // Remove height for top and bottom elements
          isPending={this.state.isLoading}
          sortedBy={this.state.sortedField}
          sortDirection={this.state.sortDirection}
          packages={searchPkgs}
          selection={this.state.selected}
          onPkgClick={this.handleClick}
          onSort={this.handleSort}
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

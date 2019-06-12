import * as React from "react";
// TODO to be more generic CondaPackage should not be used explicitly
// but it should be obtained from getPackageService method of IEnvironmentsService
import { Environments, Package, CondaPackage } from "../services";
import { CondaPkgList, TitleItem } from "./CondaPkgList";
import { CondaPkgToolBar, PkgFilters } from "./CondaPkgToolBar";
import { showDialog } from "@jupyterlab/apputils";
import { style } from "typestyle";
import { INotification } from "jupyterlab_toastify";
export interface IPkgPanelProps {
  height: number;
  environment: string;
}

export interface IPkgPanelState {
  isLoading: boolean;
  needsReload: boolean;
  isApplyingChanges: boolean;
  packages: Package.IPackages;
  selected: { [key: string]: Package.PkgStatus };
  activeFilter: PkgFilters;
  searchTerm: string;
  sortedField: TitleItem.SortField;
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
      packages: {},
      selected: {},
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
        packages: {},
        selected: {}
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
        data.updates.forEach(element => {
          let pkg = this.state.packages[element.name]; // Is undefined for new dependent package
          if (pkg !== undefined && pkg.status === Package.PkgStatus.Installed) {
            this.state.packages[element.name].updatable = true;
          }
        });
        this.setState({
          packages: this.state.packages
        });

        let available = await this._model.refresh(Package.PkgStatus.Available);
        // If current environment changes when waiting for the available package
        if (
          this._model.environment !== environmentLoading ||
          this.state.needsReload
        ) {
          return cancel(this);
        }
        data.updates.forEach(element => {
          let pkg = available[element.name]; // Is undefined for new dependent package
          if (pkg !== undefined && pkg.status === Package.PkgStatus.Installed) {
            available[element.name].updatable = true;
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

  handleClick(name: string) {
    if (this.state.isApplyingChanges) {
      return;
    }

    let clicked = this.state.packages[name];
    let selection = this.state.selected;

    if (clicked.status === Package.PkgStatus.Installed) {
      if (name in selection) {
        if (selection[name] === Package.PkgStatus.Update) {
          selection[name] = Package.PkgStatus.Remove;
        } else {
          delete selection[name];
        }
      } else {
        if (clicked.updatable) {
          selection[name] = Package.PkgStatus.Update;
        } else {
          selection[name] = Package.PkgStatus.Remove;
        }
      }
    } else if (clicked.status === Package.PkgStatus.Available) {
      if (name in selection) {
        delete selection[name];
      } else {
        selection[name] = Package.PkgStatus.Installed;
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
        let pkgs = Object.keys(this.state.selected).filter(
          name => this.state.selected[name] === Package.PkgStatus.Remove
        );
        if (pkgs.length > 0) {
          // @ts-ignore
          INotification.update({
            toastId: toastId,
            message: "Removing selected packages",
            buttons: []
          });
          await this._model.remove(pkgs);
          // console.log(response);
        }
        pkgs = Object.keys(this.state.selected).filter(
          name => this.state.selected[name] === Package.PkgStatus.Update
        );
        if (pkgs.length > 0) {
          // @ts-ignore
          INotification.update({
            toastId: toastId,
            message: "Updating selected packages",
            buttons: []
          });
          await this._model.update(pkgs);
        }
        pkgs = Object.keys(this.state.selected).filter(
          name => this.state.selected[name] === Package.PkgStatus.Installed
        );
        if (pkgs.length > 0) {
          // @ts-ignore
          INotification.update({
            toastId: toastId,
            message: "Installing new packages",
            buttons: []
          });
          await this._model.install(pkgs);
        }

        // @ts-ignore
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
        // @ts-ignore
        INotification.update({
          toastId: toastId,
          message: error.message,
          type: "error",
          autoClose: 5000,
          buttons: []
        });
      } else {
        toastId = INotification.error(error.message);
      }
    } finally {
      this.setState({
        needsReload: true, // For packages reload if loading is still in progress
        isApplyingChanges: false,
        selected: {},
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
      selected: {}
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
        packages: {}
      });
      this._updatePackages();
    }
  }

  render() {
    let filteredPkgs: Package.IPackages = {};
    if (this.state.activeFilter === PkgFilters.All) {
      filteredPkgs = this.state.packages;
    } else if (this.state.activeFilter === PkgFilters.Installed) {
      Object.keys(this.state.packages).forEach(name => {
        let pkg = this.state.packages[name];
        if (pkg.status === Package.PkgStatus.Installed) {
          filteredPkgs[name] = pkg;
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Available) {
      Object.keys(this.state.packages).forEach(name => {
        let pkg = this.state.packages[name];
        if (pkg.status === Package.PkgStatus.Available) {
          filteredPkgs[name] = pkg;
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Updatable) {
      Object.keys(this.state.packages).forEach(name => {
        let pkg = this.state.packages[name];
        if (pkg.updatable) {
          filteredPkgs[name] = pkg;
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Selected) {
      Object.keys(this.state.selected).forEach(name => {
        let pkg = this.state.packages[name];
        filteredPkgs[name] = pkg;
      });
    }

    let searchPkgs: Package.IPackages = {};
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

  private _model: Environments.IPackageService;
}

namespace Style {
  export const Panel = style({
    flexGrow: 1,
    borderLeft: "1px solid var(--jp-border-color2)"
  });
}

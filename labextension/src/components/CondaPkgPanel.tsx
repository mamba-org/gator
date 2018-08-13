import * as React from 'react';
import { PackagesModel } from '../models';
import { CondaPkgList, TitleItem } from './CondaPkgList';
import { CondaPkgToolBar, PkgFilters } from './CondaPkgToolBar';
import { CondaPkgStatusBar } from './CondaPkgStatusBar';
import { showErrorMessage } from '@jupyterlab/apputils';
import { style } from 'typestyle';
export interface IPkgPanelProps {
  height: number,
  environment: string
}

export interface IPkgPanelState {
  isLoading: boolean,
  isCheckingUpdate: boolean,
  packages: PackagesModel.IPackages,
  selected: { [key: string] : PackagesModel.PkgStatus },
  activeFilter: PkgFilters,
  searchTerm: string,
  sortedField: TitleItem.SortField,
  sortDirection: TitleItem.SortStatus
}

/** Top level React component for widget */
export class CondaPkgPanel extends React.Component<IPkgPanelProps, IPkgPanelState>{

  constructor(props: IPkgPanelProps){
    super(props);
    this.state = {
      isLoading: false,
      isCheckingUpdate: false,
      packages: {},
      selected: {},
      searchTerm: null,
      activeFilter: PkgFilters.All,
      sortedField: TitleItem.SortField.Name,
      sortDirection: TitleItem.SortStatus.Down
    }

    this._model = new PackagesModel(this.props.environment);

    this.handleCategoryChanged = this.handleCategoryChanged.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleApply = this.handleApply.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleSort = this.handleSort.bind(this);
  }

  private async _updatePackages(){
    if (!this.state.isLoading){
      this.setState({isLoading: true});
      try {
        let packages = await this._model.load();
        this.setState({
          isLoading: false,
          isCheckingUpdate: true,
          packages: packages});
        // Now get the updatable packages
        let data = await this._model.conda_check_updates();
        if(this.state.isCheckingUpdate){
          data.updates.forEach(element => {
            let pkg = this.state.packages[element.name];
            if (pkg.status === PackagesModel.PkgStatus.Installed){
              this.state.packages[element.name].updatable = true;
            }          
          });
          this.setState({
            isCheckingUpdate: false,
            packages: this.state.packages
          });
        }
      } catch (error) {
        showErrorMessage('Error', error);
      }      
    }
  }

  handleCategoryChanged(event: any) {
    this.setState({
      activeFilter: event.target.value
    });
  }

  handleClick(name: string){
    let clicked = this.state.packages[name];
    let selection = this.state.selected;

    if (clicked.status === PackagesModel.PkgStatus.Installed){
      if(name in selection){
        if (selection[name] === PackagesModel.PkgStatus.Update){
          selection[name] = PackagesModel.PkgStatus.Remove;
        } else {
          delete selection[name];
        }
      } else {
        if (clicked.updatable){
          selection[name] = PackagesModel.PkgStatus.Update;
        } else {
          selection[name] = PackagesModel.PkgStatus.Remove;
        }        
      }
    } else if (clicked.status === PackagesModel.PkgStatus.Available){
      if(name in selection){
        delete selection[name];
      } else {
        selection[name] = PackagesModel.PkgStatus.Installed;
      }
    }
    console.log(selection);
    this.setState({
      packages: this.state.packages,
      selected: selection
    });
  }
  
  handleSearch(event: any){
    console.log(event.target.value);
    this.setState({
      searchTerm: event.target.value
    })
  }

  handleApply(){}

  handleCancel(){
    this.setState({
      selected: {},
    });
  }

  handleSort(field: TitleItem.SortField, status: TitleItem.SortStatus){}

  componentDidUpdate(prevProps: IPkgPanelProps){
    if(prevProps.environment !== this.props.environment){
      this._model = new PackagesModel(this.props.environment);
      this.setState({
        isCheckingUpdate: false,
        packages: {}});
      this._updatePackages();
    }
  }

  render(){
    let info: string = '';
    if(this.state.isLoading) {
      info = 'Loading packages';
    } else if (this.state.isCheckingUpdate){
      info = 'Searching available updates';
    }

    let filteredPkgs: PackagesModel.IPackages = {};
    if (this.state.activeFilter === PkgFilters.All){
      filteredPkgs = this.state.packages
    } else if (this.state.activeFilter === PkgFilters.Installed){
      Object.keys(this.state.packages).forEach(name => {
        let pkg = this.state.packages[name];
        if(pkg.status === PackagesModel.PkgStatus.Installed){
          filteredPkgs[name] = pkg;
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Available){
      Object.keys(this.state.packages).forEach(name => {
        let pkg = this.state.packages[name];
        if(pkg.status === PackagesModel.PkgStatus.Available){
          filteredPkgs[name] = pkg;
        }
      });
    }else if (this.state.activeFilter === PkgFilters.Updatable) {
      Object.keys(this.state.packages).forEach(name => {
        let pkg = this.state.packages[name];
        if(pkg.updatable){
          filteredPkgs[name] = pkg;
        }
      });
    } else if (this.state.activeFilter === PkgFilters.Selected) {
      Object.keys(this.state.selected).forEach(name => {
        let pkg = this.state.packages[name];
        filteredPkgs[name] = pkg;
      });
    }

    let searchPkgs: PackagesModel.IPackages = {};
    if (this.state.searchTerm === null){
      searchPkgs = filteredPkgs;
    } else {
      Object.keys(filteredPkgs).forEach(name => {
        if(name.indexOf(this.state.searchTerm) > -1){
          searchPkgs[name] = filteredPkgs[name];
        }
      });
    }
    

    return (
      <div className={Style.Panel}>
        <CondaPkgToolBar
          category={this.state.activeFilter}
          hasSelection={Object.keys(this.state.selected).length > 0}
          onCategoryChanged={this.handleCategoryChanged}
          onSearch={this.handleSearch}
          onApply={this.handleApply}
          onCancel={this.handleCancel}
          />
        <CondaPkgList 
          height={this.props.height - 24 - 26 - 30 -5}  // Remove height for top and bottom elements
          sortedBy={this.state.sortedField}
          sortDirection={this.state.sortDirection}
          packages={searchPkgs}
          selection={this.state.selected}
          onPkgClick={this.handleClick}
          onSort={this.handleSort}
          />
        <CondaPkgStatusBar 
          isLoading={this.state.isLoading || this.state.isCheckingUpdate} 
          infoText={info}/>
      </div>
    );
  }

  private _model : PackagesModel;
}

namespace Style {
  export const Panel = style({
    flexGrow: 3,
    borderLeft: '1px solid var(--jp-border-color2)'
  });
}
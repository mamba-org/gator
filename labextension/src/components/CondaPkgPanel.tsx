import * as React from 'react';
import { PackagesModel } from '../models';
import { CondaPkgList, TitleItem } from './CondaPkgList';
import { CondaPkgToolBar } from './CondaPkgToolBar';
import { CondaPkgStatusBar } from './CondaPkgStatusBar';
import { showErrorMessage } from '@jupyterlab/apputils';
import { style } from 'typestyle';

export interface IPkgPanelProps {
  height: number,
  environment: string
}

export interface IPkgPanelState {
  isLoading: boolean,
  packages: PackagesModel.IPackages,
  selected: Array<string>,
  sortedField: TitleItem.SortField,
  sortDirection: TitleItem.SortStatus
}

/** Top level React component for widget */
export class CondaPkgPanel extends React.Component<IPkgPanelProps, IPkgPanelState>{

  constructor(props: IPkgPanelProps){
    super(props);
    this.state = {
      isLoading: false,
      packages: {},
      selected: [],
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
    console.log('Calling update packages with environment ' + this.props.environment)
    if (!this.state.isLoading){
      this.setState({isLoading: true});
      try {
        let packages = await this._model.load();
        this.setState({
          isLoading: false,
          packages: packages});
        // Now get the updatable packages
        let updates = await this._model.conda_check_updates();
        console.log(updates);
      } catch (error) {
        showErrorMessage('Error', error);
      }      
    }
  }

  handleCategoryChanged(name: string) {}

  handleClick(name: string){
    let clicked = this.state.packages[name];
    let selection = this.state.selected;

    if (clicked.status === PackagesModel.PkgStatus.Installed){
      let foundIdx = selection.findIndex(pkgName => pkgName === name);
      if(foundIdx > -1){
        clicked.status = PackagesModel.PkgStatus.Available;
        selection.splice(foundIdx, 1);
      } else {
        if (clicked.updatable){
          clicked.status = PackagesModel.PkgStatus.Update;
        } else {
          clicked.status = PackagesModel.PkgStatus.Remove;
        }
        selection.push(name);
      } 
    } else if (clicked.status === PackagesModel.PkgStatus.Update){
      clicked.status = PackagesModel.PkgStatus.Remove;
    } else if (clicked.status === PackagesModel.PkgStatus.Available){
      clicked.status = PackagesModel.PkgStatus.Installed;
      selection.push(name);
    } else if (clicked.status === PackagesModel.PkgStatus.Remove){
      clicked.status = PackagesModel.PkgStatus.Installed;
      selection.splice(selection.findIndex(pkgName => pkgName === name), 1);
    }

    this.setState({
      packages: this.state.packages,
      selected: selection
    });
  }
  
  handleSearch(){}

  handleApply(){}

  handleCancel(){}

  handleSort(field: TitleItem.SortField, status: TitleItem.SortStatus){}

  componentDidUpdate(prevProps: IPkgPanelProps){
    if(prevProps.environment !== this.props.environment){
      this._model = new PackagesModel(this.props.environment);
      this.setState({packages: {}});
      this._updatePackages();
    }
  }

  render(){
    let info: string = this.state.isLoading ? 'Loading packages' : '';

    return (
      <div className={Style.Panel}>
        <CondaPkgToolBar
          category='installed'
          hasSelection={true}
          onCategoryChanged={this.handleCategoryChanged}
          onSearch={this.handleSearch}
          onApply={this.handleApply}
          onCancel={this.handleCancel}
          />
        <CondaPkgList 
          height={this.props.height - 24 - 26 - 30 -5}  // Remove height for top and bottom elements
          sortedBy={this.state.sortedField}
          sortDirection={this.state.sortDirection}
          packages={this.state.packages}
          onPkgClick={this.handleClick}
          onSort={this.handleSort}
          />
        <CondaPkgStatusBar 
          isLoading={this.state.isLoading} 
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
import * as React from 'react';
import { PackagesModel } from '../models';
import { CondaPkgList } from './CondaPkgList';
import { CondaPkgToolBar } from './CondaPkgToolBar';
import { CondaPkgStatusBar } from './CondaPkgStatusBar';
import { showErrorMessage } from '@jupyterlab/apputils';
import { style } from 'typestyle';

export interface IPkgPanelProps {
  height: number,
  environment: string
}

export interface IPkgPanelState {
  packages: Array<PackagesModel.IPackage>
}

/** Top level React component for widget */
export class CondaPkgPanel extends React.Component<IPkgPanelProps, IPkgPanelState>{

  constructor(props: IPkgPanelProps){
    super(props);
    this.state = {
      packages: []
    }

    this._model = new PackagesModel(this.props.environment);

    this.handleCategoryChanged = this.handleCategoryChanged.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleApply = this.handleApply.bind(this);
    this.handleCancel = this.handleCancel.bind(this);

    this._updatePackages();
  }

  private async _updatePackages(){
    try {
      let packages = await this._model.load();
      this.setState(packages);
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  handleCategoryChanged() {}
  
  handleSearch(){}

  handleApply(){}

  handleCancel(){}

  componentWillReceiveProps(newProps: IPkgPanelProps){
    if(newProps.environment !== this.props.environment){
      this._model = new PackagesModel(newProps.environment);
      this._updatePackages();
    }
  }

  render(){
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
          packages={this.state.packages}/>
        <CondaPkgStatusBar isLoading={true} infoText={'Loading packages'}/>
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
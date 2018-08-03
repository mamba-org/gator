import * as React from 'react';
import { IPackage, CondaPkgItem } from './CondaPkgItem';
import { requestServer } from './CondaEnv';
import { URLExt } from '@jupyterlab/coreutils';
import { showErrorMessage } from '@jupyterlab/apputils';

// import { IPackage } from './CondaPkgItem'

export interface IPkgListProps {
  environment?: string
}

export interface IPkgListState {
  packages: Array<IPackage>
}

/** Top level React component for widget */
export class CondaPkgList extends React.Component<IPkgListProps, IPkgListState>{
  private _lastEnvironment?: string;

  constructor(props){
    super(props);
    this.state = {
      packages: new Array()
    }

    this.updatePkgs = this.updatePkgs.bind(this);
  }

  async updatePkgs(name: string){
    try {
      let request: RequestInit = {
        method: 'GET'
      }
      let response = await requestServer(URLExt.join('conda/environments', name), request);
      let data = await response.json() as IPkgListState;

      this.setState({ packages: data.packages });

    } catch (err) {
      showErrorMessage('Error', 'An error occurred while retrieving installed packages.');
    }
  };

  async handleChangePackage(){

  }

  render(){
    if (this.props.environment !== this._lastEnvironment) {
      this.updatePkgs(this.props.environment);
      this._lastEnvironment = this.props.environment;
    }

    const listItems = this.state.packages.map((pkg, idx) => {
      return (
        <CondaPkgItem 
          name={pkg.name} 
          key={"pkg-" + idx} 
          selected={true} 
          version={pkg.version} 
          build={pkg.build} 
          onChange={this.handleChangePackage} />);
    });

    return (
      <div id="installed_packages" className="half_width" style={{display: 'table-cell', width: '70%'}}>
      {/* <div id="installed_packages" className="half_width" style={{float: 'right'}}> */}
        <div id="pkg_toolbar" className="list_toolbar row">
          <div className="col-xs-8 no-padding">
            <span id="pkg_list_info" className="toolbar_info">Installed Conda packages</span>
          </div>
          <div className="col-xs-4 no-padding tree-buttons">
            <span id="pkg_buttons" className="toolbar_buttons pull-right">
            <button id="refresh_pkg_list" title="Refresh package list"     className="btn btn-default btn-xs"><i className="fa fa-refresh"       ></i></button>
            <button id="check_update"     title="Check for Updates"        className="btn btn-default btn-xs"><i className="fa fa-check"         ></i></button>
            <button id="update_pkgs"      title="Update selected packages" className="btn btn-default btn-xs"><i className="fa fa-cloud-download"></i></button>
            <button id="remove_pkgs"      title="Remove selected packages" className="btn btn-default btn-xs"><i className="fa fa-trash-o"       ></i></button>
            </span>
          </div>
        </div>
        <div id="pkg_list" className ="list_container" style={{width: '100%', display: 'table'}}>
          <div id="pkg_list_header" className="list_header row">
          </div>
          <div id="pkg_list_body" className="list_body scrollable">
            {listItems}
          </div>
        </div>
      </div>
    );
  }
}
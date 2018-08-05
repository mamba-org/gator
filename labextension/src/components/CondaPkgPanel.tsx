import * as React from 'react';
import { PackagesModel } from '../models';
import { CondaPkgList } from './CondaPkgList';

export interface IPkgPanelProps {
  model: PackagesModel
}

/** Top level React component for widget */
export class CondaPkgPanel extends React.Component<IPkgPanelProps>{
  render(){
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
        <CondaPkgList packages={this.props.model.packages}/>
      </div>
    );
  }
}

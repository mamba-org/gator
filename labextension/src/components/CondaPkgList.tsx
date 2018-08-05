import * as React from 'react';
import { CondaPkgItem } from './CondaPkgItem';
import { PackagesModel } from '../models';

export interface IPkgListProps extends PackagesModel.IPackages {
}

/** Top level React component for widget */
export class CondaPkgList extends React.Component<IPkgListProps>{

  constructor(props){
    super(props);
  }

  async handleChangePackage(){

  }

  render(){
    const listItems = this.props.packages.map((pkg, idx) => {
      return (
        <CondaPkgItem 
          name={pkg.name} 
          key={"pkg-" + idx} 
          installed={pkg.installed}
          updatable={pkg.updatable}
          version={pkg.version} 
          build={pkg.build} 
          onChange={this.handleChangePackage} />);
    });

    return (
        <div id="pkg_list" className ="list_container" style={{width: '100%', display: 'table'}}>
          <div id="pkg_list_header" className="list_header row">
          </div>
          <div id="pkg_list_body" className="list_body scrollable">
            {listItems}
          </div>
        </div>
    );
  }
}
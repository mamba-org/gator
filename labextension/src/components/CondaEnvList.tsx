import * as React from 'react';

import { EnvironmentsModel } from "../models";

import { CondaEnvItem } from "./CondaEnvItem";
import { CondaEnvToolBar } from './CondaEnvToolBar';

export interface IEnvListProps extends EnvironmentsModel.IEnvironments {
  onSelectedChange: (name: string) => void,
  onCreate: () => void,
  onClone: () => void,
  onImport: () => void,
  onRemove: () => void
}

/** React component for the environment list */
export class CondaEnvList extends React.Component<IEnvListProps>{

  render(){
    const listItems = this.props.environments.map((env, idx) => {
      return <CondaEnvItem name={env.name} key={"env-" + idx} />;
    });

    return (
      <div>
        <div style={{display: 'table-cell', width: '30%'}}>
          <div className="list_toolbar row">
              <span className="toolbar_info">Conda environments</span>
          </div>
          <div className="list_container" style={{width: '100%', display: 'table'}}>
            <div className="list_body">
              {listItems}
            </div>
          </div>
        </div>      
        
        <CondaEnvToolBar 
          onCreate={this.props.onCreate} 
          onClone={this.props.onClone}
          onImport={this.props.onImport}
          onRemove={this.props.onRemove} />
      </div>
    );
  }
}
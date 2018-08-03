import { IEnvironment, CondaEnvItem } from "./CondaEnvItem";

import * as React from 'react';

export interface IEnvListProps {
  environments: Array<IEnvironment>,
  onSelectedChange: (name: string) => void
}

/** React component for the environment list */
export class CondaEnvList extends React.Component<IEnvListProps>{

  render(){
    const listItems = this.props.environments.map((env, idx) => {
      return <CondaEnvItem name={env.name} key={"env-" + idx} />;
    });

    return (
      <div id="environments" style={{display: 'table-cell', width: '30%'}}>
        <div id="env_toolbar" className="list_toolbar row">
          <div className="col-xs-10 no-padding">
            <span id="env_list_info" className="toolbar_info">Conda environments</span>
          </div>
          <div className="col-xs-2 no-padding tree-buttons">
            <span id="env_buttons" className="toolbar_buttons pull-right">
            <button id="new_env" title="Create new environment" className="btn btn-default btn-xs"><i className="fa fa-plus"></i></button>
            <button id="refresh_env_list" title="Refresh environment list" className="btn btn-default btn-xs"><i className="fa fa-refresh"></i></button>
            </span>
          </div>
        </div>
        <div id="env_list" className="list_container" style={{width: '100%', display: 'table'}}>
          <div id="env_list_header" className="list_header row">
          </div>
          <div id="env_list_body" className="list_body scrollable">
            {listItems}
          </div>
        </div>
      </div>
    );
  }
}
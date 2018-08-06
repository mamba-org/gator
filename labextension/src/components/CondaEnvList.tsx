import * as React from 'react';
import { style } from 'typestyle';

import { EnvironmentsModel } from "../models";

import { CondaEnvItem } from "./CondaEnvItem";
import { CondaEnvToolBar } from './CondaEnvToolBar';

export interface IEnvListProps extends EnvironmentsModel.IEnvironments {
  onSelectedChange: (name: string) => void,
  onCreate(),
  onClone(),
  onImport(),
  onRemove()
}

/** React component for the environment list */
export class CondaEnvList extends React.Component<IEnvListProps>{

  render(){
    const listItems = this.props.environments.map((env, idx) => {
      return <CondaEnvItem name={env.name} key={"env-" + idx} />;
    });

    return (
      <div className={Style.Panel}>
        <div className={Style.NoGrow}>
            <span>Conda environments</span>
        </div>
        <div className={Style.ListEnvs}>
          {listItems}
        </div>  
        <div className={Style.NoGrow}>
          <CondaEnvToolBar
            onCreate={this.props.onCreate} 
            onClone={this.props.onClone}
            onImport={this.props.onImport}
            onRemove={this.props.onRemove} />
        </div>
      </div>
    );
  }
}

namespace Style{
  export const Panel = style({
    flexGrow: 1,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column'
  });

  export const NoGrow = style({
    flexGrow: 0,
    flexShrink: 0
  });

  export const ListEnvs = style({
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column'
  });
}
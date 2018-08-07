import * as React from 'react';
import { style } from 'typestyle';

import { EnvironmentsModel } from "../models";

import { CondaEnvItem } from "./CondaEnvItem";
import { CondaEnvToolBar } from './CondaEnvToolBar';

export interface IEnvListProps extends EnvironmentsModel.IEnvironments {  
  height: number,
  environments: Array<EnvironmentsModel.IEnvironment>,
  selected: string,
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
      return (
      <CondaEnvItem 
        name={env.name} 
        key={"env-" + idx} 
        selected={this.props.selected ? env.name === this.props.selected : false}/>);
    });

    return (
      <div className={Style.Panel}>
        <div className={Style.Title}>
            <span>Conda environments</span>
        </div>
        <div className={Style.ListEnvs(this.props.height - 29 - 32)}>
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
    flexDirection: 'column',
    overflowX: 'hidden'
  });

  export const Title = style({
    color: 'var(--jp-ui-font-color1)',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 'var(--jp-ui-font-size2)',    
    height: '32px' // --jp-private-settingeditor-switcher-height
  });

  export const NoGrow = style({
    flexGrow: 0,
    flexShrink: 0
  });

  export const ListEnvs = (height: number) => style({
    height: 'calc(' + height + 'px - var(--jp-toolbar-micro-height))',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  });
}
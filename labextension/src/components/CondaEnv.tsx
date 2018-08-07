import * as React from 'react';
import { style } from 'typestyle';

import { CondaEnvList } from './CondaEnvList';
import { CondaPkgPanel } from './CondaPkgPanel';
import { EnvironmentsModel } from '../models';
import { showErrorMessage } from '@jupyterlab/apputils';

export interface ICondaEnvProps {
  height: number,
  width: number,
  model: EnvironmentsModel
}

export interface ICondaEnvState extends EnvironmentsModel.IEnvironments {
  currentEnvironment?: string
}

/** Top level React component for widget */
export class CondaEnv extends React.Component<ICondaEnvProps, ICondaEnvState>{
  
  constructor(props){
    super(props);

    this.state = {
      environments: new Array(),
      currentEnvironment: undefined
    };

    this.handleEnvironmentChange = this.handleEnvironmentChange.bind(this);
    this.handleCreateEnvironment = this.handleCreateEnvironment.bind(this);
    this.handleCloneEnvironment = this.handleCloneEnvironment.bind(this);
    this.handleImportEnvironment = this.handleImportEnvironment.bind(this);
    this.handleRemoveEnvironment = this.handleRemoveEnvironment.bind(this);
  }

  handleEnvironmentChange(name: string){
    this.setState({
      currentEnvironment: name
    });
  }

  handleCreateEnvironment(){
    // TODO
  }

  handleCloneEnvironment(){
    // TODO
  }

  handleImportEnvironment(){
    // TODO
  }

  handleRemoveEnvironment(){
    // TODO
  }

  async componentDidMount(){
    try{
      let newState: Partial<ICondaEnvState> = await this.props.model.load();
      if (this.state.currentEnvironment === undefined) {
        newState.environments.forEach(env => {
          if (env.is_default){
            newState.currentEnvironment = env.name;
          }
        });
      }

      this.setState(newState as ICondaEnvState);
    } catch (error) {
      showErrorMessage('Error', error);
    }
  }

  render() {
    return (
      <div className={Style.Panel}>
        <CondaEnvList 
          height={this.props.height}
          environments={this.state.environments}
          selected={this.state.currentEnvironment}
          onSelectedChange={this.handleEnvironmentChange}
          onCreate={this.handleCreateEnvironment}
          onClone={this.handleCloneEnvironment}
          onImport={this.handleImportEnvironment}
          onRemove={this.handleRemoveEnvironment} />
        <CondaPkgPanel
          height={this.props.height} 
          environment={this.state.currentEnvironment} />
      </div>      
    );
  }
}

namespace Style {
  export const Panel =  style({
    width: '100%',
    display: 'flex', 
    flexDirection: 'row',
    borderCollapse: 'collapse'
  });
}
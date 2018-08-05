import * as React from 'react';

import { CondaEnvList } from './CondaEnvList';
import { CondaPkgPanel } from './CondaPkgPanel';
import { EnvironmentsModel, PackagesModel } from '../models';

export interface ICondaEnvProps {
  height: number,
  width: number,
  model: EnvironmentsModel
}

export interface ICondaEnvState extends EnvironmentsModel.IEnvironments {
  currentEnvironment?: string
  pkgsModel : PackagesModel
}

/** Top level React component for widget */
export class CondaEnv extends React.Component<ICondaEnvProps, ICondaEnvState>{
  
  constructor(props){
    super(props);
    this.state = {
      environments: new Array(),
      currentEnvironment: undefined,
      pkgsModel: new PackagesModel()
    };

    this.handleEnvironmentChange = this.handleEnvironmentChange.bind(this);
  }

  handleEnvironmentChange(name: string){
    this.setState({
      currentEnvironment: name,
      pkgsModel: new PackagesModel(name)
    });
  }

  async componentDidMount(){
    let newState: Partial<ICondaEnvState> = await this.props.model.load();
    if (this.state.currentEnvironment === undefined) {
      newState.environments.forEach(env => {
        if (env.is_default){
          newState.currentEnvironment = env.name;
          newState.pkgsModel = new PackagesModel(env.name);
        }
      });
    }

    this.setState(newState as ICondaEnvState);
  }

  render() {
    return (
      <div id="conda" className="tab-pane" style={{width: '100%', display: 'table', borderCollapse: 'collapse'}}>
        <div style={{  padding: '10px', width: '100%', display: 'table-row'}}>
          <CondaEnvList 
            environments={this.state.environments}
            onSelectedChange={this.handleEnvironmentChange} />
          <CondaPkgPanel 
            model={this.state.pkgsModel} />
        </div>
      </div>      
    );
  }
}
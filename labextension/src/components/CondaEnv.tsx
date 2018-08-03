import * as React from 'react';

import { CondaEnvList, IEnvListProps } from './CondaEnvList';
import { CondaPkgList } from './CondaPkgList';
import { showErrorMessage } from '@jupyterlab/apputils';
import { ServerConnection } from '@jupyterlab/services';
import { URLExt } from '@jupyterlab/coreutils';
import { IEnvironment } from './CondaEnvItem';
import { IPackage } from './CondaPkgItem';

/** Helper functions for carry on python notebook server request 
 * 
 * @param {string} url : request url
 * @param {RequestInit} request : initialization parameters for the request
 * @returns {Promise<Response>} : reponse to the request
 */
export
async function requestServer(url: string, request: RequestInit): Promise<Response>{
  let settings = ServerConnection.makeSettings();
  let fullUrl = URLExt.join(settings.baseUrl, url);

  try {
    let response = await ServerConnection.makeRequest(fullUrl, request, settings);
    if(!response.ok){
      throw new ServerConnection.ResponseError(response);
    }
    return Promise.resolve(response);
  } catch(reason) {
    throw new ServerConnection.NetworkError(reason);
  }
}

export interface ICondaEnvState {
  environments: Array<IEnvironment>
  currentEnvironment?: string,
  packages: Array<IPackage>
}


/** Top level React component for widget */
export class CondaEnv extends React.Component<any, ICondaEnvState>{
  
  constructor(props){
    super(props);
    this.state = {
      environments: new Array(),
      currentEnvironment: undefined,
      packages: new Array()
    };

    this.updateEnvs = this.updateEnvs.bind(this);
    this.handleEnvironmentChange = this.handleEnvironmentChange.bind(this);
    
    this.updateEnvs();
  }

  /** Update the list of available environments */
  async updateEnvs() {
    try {
      let request: RequestInit = {
        method: 'GET'
      }
      let response = await requestServer('conda/environments', request);
      let data = await response.json() as IEnvListProps;

      let newState: any = { environments: data.environments };
      if (this.state.currentEnvironment === undefined) {
        data.environments.forEach(env => {
          if (env.is_default){
            newState.currentEnvironment = env.name;
          }
        });
      }

      this.setState(newState);

    } catch (err) {
      showErrorMessage('Error', 'An error occurred while listing Conda environments.');
    }
  };

  handleEnvironmentChange(name: string){
    this.setState({currentEnvironment: name});
  }

  render() {
    return (
      <div id="conda" className="tab-pane" style={{width: '100%', display: 'table', borderCollapse: 'collapse'}}>
        <div style={{  padding: '10px', width: '100%', display: 'table-row'}}>
          <CondaEnvList 
            environments={this.state.environments}
            onSelectedChange={this.handleEnvironmentChange} />
          <CondaPkgList 
            environment={this.state.currentEnvironment} />
        </div>
      </div>      
    );
  }
}
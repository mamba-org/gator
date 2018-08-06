import { Token } from "@phosphor/coreutils";
import { ServerConnection } from "@jupyterlab/services";
import { URLExt } from "@jupyterlab/coreutils";

export const ICondaEnv = new Token<ICondaEnv>('jupyterlab_nb_conda:ICondaEnv');

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

/* Whitelist of environment to show in the conda package manager. If the list contains
 * only one entry, the environment list won't be shown.
 */
export interface ICondaEnv {
  selectedEnv?: string,
  environments: Promise<Array<EnvironmentsModel.IEnvironment>>
}

export class EnvironmentsModel implements ICondaEnv{

  public selectedEnv?: string;

  constructor(){
    this.selectedEnv = undefined;
    this._environments = new Array<EnvironmentsModel.IEnvironment>();
  }
  
  public get environments() : Promise<Array<EnvironmentsModel.IEnvironment>> {
    if (this._environments.length === 0){
      return this.load()
        .then(envs => {
          this._environments = envs.environments;
          return Promise.resolve(this._environments);
        })
    } else {
      return Promise.resolve(this._environments);
    }
  }  

  clone(){

  };

  create(){

  };

  export(){

  };

  async load(): Promise<EnvironmentsModel.IEnvironments>{
    try {
      let request: RequestInit = {
        method: 'GET'
      }
      let response = await requestServer(URLExt.join('conda', 'environments'), request);
      let data = await response.json() as EnvironmentsModel.IEnvironments;
      this._environments = data.environments;
      return data;

    } catch (err) {
      throw new Error('An error occurred while listing Conda environments.');
    }
  };

  remove(){

  };

  private _environments: Array<EnvironmentsModel.IEnvironment>;
}

export namespace EnvironmentsModel {

  /**
   * Description of the REST API attributes for each environment
   */
  export interface IEnvironment {
    name: string;
    dir: string;
    is_default: boolean;
  }

  /**
   * Description of the REST API response when loading environments
   */
  export interface IEnvironments {
    environments: Array<IEnvironment>;
  }
}

export class PackagesModel{

  packages: Array<PackagesModel.IPackage>;
  environment?: string;

  constructor(environment? : string){
    this.environment = environment;
    this.packages = new Array<PackagesModel.IPackage>();
    this.load();
  }

  async load(): Promise<PackagesModel.IPackages>{
    if (this.environment === undefined){
      this.packages = new Array<PackagesModel.IPackage>();
      return Promise.resolve({ packages: new Array<PackagesModel.IPackage>()});
    }

    try {
      let request: RequestInit = {
        method: 'GET'
      }
      // // Get all available packages
      // let all_response = await requestServer(URLExt.join('conda', 'packages', 'available'), request);
      // let all_data = await all_response.json() as PackagesModel.IPackages;

      // Get installed packages
      let response = await requestServer(URLExt.join('conda', 'environments', this.environment), request);
      let data = await response.json() as PackagesModel.IPackages;
      
      this.packages = data.packages;
      return data;

      // // Set installed package status
      // //- packages are sorted by name, we take advantage of this.
      // let all_packages = all_data.packages;
      // let final_list = new Array<PackagesModel.IPackage>();

      // let availableIdx = 0;
      // let installedIdx = 0;

      // while(availableIdx < all_packages.length){
      //   let pkg = all_packages[availableIdx];
      //   if(installedIdx < data.packages.length){
      //     let installed = data.packages[installedIdx];
      //     if (pkg.name > installed.name) { // installed is not in available
      //       availableIdx -= 1;
      //     }
      //     if (pkg.name === installed.name){
      //       pkg = installed;  // If available name matching installed, installed is added as it may be updatable
      //       pkg.installed = true;
      //       installedIdx += 1;
      //     }
      //   }
      //   final_list.push(pkg);
      //   availableIdx += 1;
      // }

      // this.packages = final_list;

      // return {packages: final_list};

    } catch (err) {
      throw new Error('An error occurred while retrieving available packages.');
    }
  }

  conda_install(){
    if (this.environment === undefined){
      return
    }

  }

  conda_check_updates(){
    if (this.environment === undefined){
      return
    }
  }

  conda_update(){
    if (this.environment === undefined){
      return
    }
  }

  conda_remove(){
    if (this.environment === undefined){
      return
    }
  }
}

export namespace PackagesModel {

  /**
   * Description of the REST API attributes for each package
   */
  export interface IPackage {
    name: string,
    version: string,
    build: string,
    installed?: boolean,
    updatable?: boolean
  }

  /**
   * Description of the REST API response when loading packages
   */
  export interface IPackages {
    packages: Array<IPackage>
  }
}
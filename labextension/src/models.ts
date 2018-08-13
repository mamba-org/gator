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

  async clone(target: string, name: string): Promise<any>{
    try {
      let request: RequestInit = {
        body: JSON.stringify({ name }),
        method: 'POST'
      }
      let response = await requestServer(URLExt.join('conda', 'environments', target, 'clone'), request);
      let data = await response.json();
      return data;

    } catch (err) {
      throw new Error('An error occurred while cloning "' + target + '".');
    }
  };

  async create(name: string, type?: 'python2' | 'python3' | 'r'): Promise<any>{
    try {
      let request: RequestInit = {
        body: JSON.stringify({ type }),
        method: 'POST'
      }
      let response = await requestServer(URLExt.join('conda', 'environments', name, 'create'), request);
      let data = await response.json();
      return data;

    } catch (err) {
      throw new Error('An error occurred while creating "' + name + '".');
    }
  };

  export(name: string): Promise<any>{
    try {
      let request: RequestInit = {
        method: 'GET'
      }
      return requestServer(URLExt.join('conda', 'environments', name, 'export'), request);
      
    } catch (err) {
      throw new Error('An error occurred while exporting Conda environment "' + name + '".');
    }
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

  async remove(name: string){
    try {
      let request: RequestInit = {
        method: 'POST'
      }
      let response = await requestServer(URLExt.join('conda', 'environments', name, 'delete'), request);
      let data = await response.json();
      return data;

    } catch (err) {
      throw new Error('An error occurred while removing "' + name + '".');
    }
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

  packages: PackagesModel.IPackages;
  environment?: string;

  constructor(environment? : string){
    this.environment = environment;
    this.packages = {};
    // this.load();
  }

  private waitAnswer(response: Response): Promise<Response>{
      return new Promise((resolve, reject) => {
        if (response.status == 202){
          console.log('Retry requesting the packages');

          setTimeout(() => { 
            requestServer(URLExt.join('conda', 'packages', 'available'), { method: 'GET' })
            .then(response => {
              resolve(this.waitAnswer(response));
            });
          },
          1000)
        } else {
          console.log('Found the packages');
          resolve(response);
        }
      });
    }

  async load(): Promise<PackagesModel.IPackages>{
    if (this.environment === undefined){
      this.packages = {};
      return Promise.resolve({});
    }

    try {
      console.log('in loading package for environment ' + this.environment)
      let request: RequestInit = {
        method: 'GET'
      }
      // Get all available packages
      let first_reply = await requestServer(URLExt.join('conda', 'packages', 'available'), request);
      let available_pkgs = await this.waitAnswer(first_reply);
      let all_data = await available_pkgs.json() as {packages: Array<PackagesModel.IPackage>};

      // Get installed packages
      let response = await requestServer(URLExt.join('conda', 'environments', this.environment), request);
      let data = await response.json() as {packages: Array<PackagesModel.IPackage>};

      // Set installed package status
      //- packages are sorted by name, we take advantage of this.
      let all_packages = all_data.packages;
      let final_list = {};

      let availableIdx = 0;
      let installedIdx = 0;

      while(availableIdx < all_packages.length){
        let pkg = all_packages[availableIdx];
        pkg.status = PackagesModel.PkgStatus.Available;
        if(installedIdx < data.packages.length){
          let installed = data.packages[installedIdx];
          if (pkg.name > installed.name) { // installed is not in available
            pkg = installed;
            availableIdx -= 1;
          }
          if (pkg.name === installed.name){
            pkg = installed;  // If available name matching installed, installed is added as it may be updatable
            pkg.status = PackagesModel.PkgStatus.Installed;
            installedIdx += 1;
          }
        }
        let split_url = pkg.channel.split('/');
        if (split_url.length > 1){
          pkg.channel = split_url[split_url.length - 2];
        }
        final_list[pkg.name] = pkg;
        availableIdx += 1;
      }

      this.packages = final_list;

      return final_list;

    } catch (err) {
      throw new Error('An error occurred while retrieving available packages.');
    }
  }

  async conda_install(packages: Array<string>): Promise<any>{
    if (this.environment === undefined || packages.length === 0){
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify(packages),
        method: 'POST'
      }
      let response = await requestServer(URLExt.join('conda', 'environments', this.environment, 'packages', 'install'), request);
      let data = await response.json();
      return data;
      
    } catch (error) {
      throw new Error('An error occurred while installing packages.');
    }
  }

  async conda_check_updates(): Promise<{updates: Array<PackagesModel.UpdateAPI>}>{
    if (this.environment === undefined){
      return Promise.resolve({updates: []});
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify([]),
        method: 'POST'
      }
      let response = await requestServer(URLExt.join('conda', 'environments', this.environment, 'packages', 'check'), request);
      let data = await response.json();
      return data;
      
    } catch (error) {
      throw new Error('An error occurred while checking for package updates.');
    }
  }

  async conda_update(packages: Array<string>): Promise<any>{
    if (this.environment === undefined){
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify(packages),
        method: 'POST'
      }
      let response = await requestServer(URLExt.join('conda', 'environments', this.environment, 'packages', 'update'), request);
      let data = await response.json();
      return data;
      
    } catch (error) {
      throw new Error('An error occurred while updating packages.');
    }
  }

  async conda_remove(packages: Array<string>): Promise<any>{
    if (this.environment === undefined){
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify(packages),
        method: 'POST'
      }
      let response = await requestServer(URLExt.join('conda', 'environments', this.environment, 'packages', 'remove'), request);
      let data = await response.json();
      return data;
      
    } catch (error) {
      throw new Error('An error occurred while removing packages.');
    }
  }
}

export namespace PackagesModel {

  export enum PkgStatus {
    Installed = 'INSTALLED',
    Update = 'UPDATE',
    Remove = 'REMOVE',
    Available = 'AVAILABLE'
  }

  /**
   * Description of the REST API attributes for each package
   */
  export interface IPackage {
    name: string,
    version: string,
    build: string,
    channel?: string,
    status?: PkgStatus,
    updatable?: boolean
  }

  export interface IRawPackage extends IPackage {
    arch: string | null,
    build_number: number,
    channel: string,
    constrains: Array<string>,
    depends: Array<string>,
    fn: string,
    license: string,
    md5: string,
    platform: string | null,
    size: number,
    subdir: string,
    timestamp: number,
    url: string
  }

  export interface UpdateAPI {
    base_url: string | null,
    build_number: number,
    build_string: string,
    channel: string,
    dist_name: string,
    name: string,
    platform: string | null,
    version: string
  }

  /**
   * Description of the REST API response when loading packages
   */
  export interface IPackages {
    [key: string] : IPackage
  }
}
import { Token } from "@phosphor/coreutils";
import { ServerConnection } from "@jupyterlab/services";
import { URLExt } from "@jupyterlab/coreutils";
import { IDisposable } from "@phosphor/disposable";

export const IEnvironmentService = new Token<IEnvironmentService>(
  "jupyterlab_conda:IEnvironmentService"
);

/* TODO Whitelist of environment to show in the conda package manager. If the list contains
 * only one entry, the environment list won't be shown.
 */

/**
 * Interface for the environment service
 */
export interface IEnvironmentService extends IDisposable {
  /**
   * Get all available environments
   */
  environments: Promise<Array<Environments.IEnvironment>>;

  /**
   * Refersh available environments list
   */
  refresh(): Promise<Environments.IEnvironments>;

  /**
   * Get all packages channels avalaible in the requested environment
   *
   * @param name environment name
   */
  getChannels(name: string): Promise<Environments.IChannels>;

  /**
   * Duplicate a given environment
   *
   * @param target name of the environment to be cloned
   * @param name name of the new environment
   */
  clone(target: string, name: string): Promise<any>;

  /**
   * Create a new environment
   *
   * @param name name of the new environment
   * @param type type of environment to create
   */
  create(name: string, type?: Environments.IType): Promise<any>;

  /**
   * Export the packages list of an environment
   *
   * @param name name of the environment to be exported
   */
  export(name: string): Promise<Response>;

  /**
   * Create an environment from a packages list file
   *
   * @param name name of the environment to create
   * @param fileContent file content of the file containing the packages list to import
   */
  import(name: string, fileContent: string): Promise<any>;

  /**
   * Remove a given environment
   *
   * @param name name of the environment to be removed
   */
  remove(name: string): Promise<any>;

  /**
   * Get packages service for the given environment
   *
   * @param name name of the environment to work with
   */
  getPackageService(name: string): Environments.IPackageService;
}

export namespace Environments {
  /**
   * Description of the REST API response for each environment
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

  /**
   * Description of the REST API response when requesting the channels
   */
  export interface IChannels {
    [key: string]: Array<string>;
  }

  /**
   * Type of environment that can be created.
   */
  export type IType = "python2" | "python3" | "r" | string;

  /**
   * Interface of the packages service
   */
  export interface IPackageService {
    /**
     * List of available packages
     */
    packages: Package.IPackages;
    /**
     * Environment in which packages are handled
     */
    environment?: string;

    /**
     * Refresh available packages of the environment
     */
    refresh(): Promise<Package.IPackages>;

    /**
     * Install packages
     *
     * @param packages List of packages to be installed
     */
    install(packages: Array<string>): Promise<any>;

    /**
     * Install a package in development mode
     *
     * @param path Path to the package to install in development mode
     */
    develop(path: string): Promise<any>;

    /**
     * Check for updates
     */
    check_updates(): Promise<{
      updates: Array<Package.UpdateAPI>;
    }>;

    /**
     * Update packages
     *
     * @param packages List of packages to be updated
     */
    update(packages: Array<string>): Promise<any>;

    /**
     * Remove packages
     *
     * @param packages List of packages to be removed
     */
    remove(packages: Array<string>): Promise<any>;
  }
}

export namespace Package {
  export enum PkgStatus {
    Installed = "INSTALLED",
    Update = "UPDATE",
    Remove = "REMOVE",
    Available = "AVAILABLE"
  }

  export const PkgSubDirs = [
    "linux-64",
    "linux-32",
    "linux-ppc64le",
    "linux-armv6l",
    "linux-armv7l",
    "linux-aarch64",
    "win-64",
    "win-32",
    "osx-64",
    "zos-z",
    "noarch"
  ];

  /**
   * Description of the REST API attributes for each package
   */
  export interface IPackage {
    name: string;
    version: Array<string>;
    build_number: Array<number>;
    build_string: Array<string>;
    channel: string;
    platform: string;
    summary: string;
    home: string;
    keywords: Array<string>;
    tags: Array<string>;
    version_installed?: string;
    status?: PkgStatus;
    updatable?: boolean;
  }

  export interface IRawPackage {
    name: string;
    version: string;
    build_number: number;
    build_string: string;
    channel: string;
    platform: string;
  }

  export interface UpdateAPI extends IRawPackage {}

  /**
   * Description of the REST API response when loading packages
   */
  export interface IPackages {
    [key: string]: IPackage;
  }
}

/** Helper functions to carry on python notebook server request
 *
 * @param {string} url : request url
 * @param {RequestInit} request : initialization parameters for the request
 * @returns {Promise<Response>} : reponse to the request
 */
export async function requestServer(
  url: string,
  request: RequestInit
): Promise<Response> {
  let settings = ServerConnection.makeSettings();
  let fullUrl = URLExt.join(settings.baseUrl, url);

  try {
    let response = await ServerConnection.makeRequest(
      fullUrl,
      request,
      settings
    );
    if (!response.ok) {
      throw new ServerConnection.ResponseError(response);
    }
    return Promise.resolve(response);
  } catch (reason) {
    throw new ServerConnection.NetworkError(reason);
  }
}

export class CondaEnvironments implements IEnvironmentService {
  constructor() {
    this._environments = new Array<Environments.IEnvironment>();
    this._environmentsTimer = (setInterval as any)(() => {
      this.refresh();
    }, 61000);
  }

  public get environments(): Promise<Array<Environments.IEnvironment>> {
    if (this._environments.length === 0) {
      return this.refresh().then(envs => {
        this._environments = envs.environments;
        return Promise.resolve(this._environments);
      });
    } else {
      return Promise.resolve(this._environments);
    }
  }

  getPackageService(name: string): Environments.IPackageService {
    return new CondaPackage(name);
  }

  /**
   * Test whether the manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  async getChannels(name: string): Promise<Environments.IChannels> {
    try {
      let request = {
        method: "GET"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", name, "channels"),
        request
      );
      if (response.ok) {
        let data = await response.json();
        return data["channels"] as Environments.IChannels;
      } else {
        throw new Error(`Fail to get the channels for environment ${name}.`);
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async clone(target: string, name: string): Promise<any> {
    try {
      let request: RequestInit = {
        body: JSON.stringify({ name }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", target, "clone"),
        request
      );
      let data = await response.json();
      return data;
    } catch (err) {
      throw new Error('An error occurred while cloning "' + target + '".');
    }
  }

  async create(name: string, type?: Environments.IType): Promise<any> {
    try {
      let request: RequestInit = {
        body: JSON.stringify({ type }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", name, "create"),
        request
      );
      let data = await response.json();
      return data;
    } catch (err) {
      throw new Error('An error occurred while creating "' + name + '".');
    }
  }

  export(name: string): Promise<Response> {
    try {
      let request: RequestInit = {
        method: "GET"
      };
      return requestServer(
        URLExt.join("conda", "environments", name, "export"),
        request
      );
    } catch (err) {
      throw new Error(
        'An error occurred while exporting Conda environment "' + name + '".'
      );
    }
  }

  async import(name: string, fileContent: string): Promise<any> {
    try {
      let request: RequestInit = {
        body: JSON.stringify({ file: fileContent }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", name, "import"),
        request
      );
      let data = await response.json();
      return data;
    } catch (err) {
      throw new Error('An error occurred while creating "' + name + '".');
    }
  }

  async refresh(): Promise<Environments.IEnvironments> {
    try {
      let request: RequestInit = {
        method: "GET"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments"),
        request
      );
      let data = (await response.json()) as Environments.IEnvironments;
      this._environments = data.environments;
      return data;
    } catch (err) {
      throw new Error("An error occurred while listing Conda environments.");
    }
  }

  async remove(name: string): Promise<any> {
    try {
      let request: RequestInit = {
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", name, "delete"),
        request
      );
      let data = await response.json();
      return data;
    } catch (err) {
      throw new Error('An error occurred while removing "' + name + '".');
    }
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearInterval(this._environmentsTimer);
    this._environments.length = 0;
  }

  private _isDisposed = false;
  private _environments: Array<Environments.IEnvironment>;
  private _environmentsTimer = -1;
}

export class CondaPackage implements Environments.IPackageService {
  packages: Package.IPackages;
  environment?: string;

  constructor(environment?: string) {
    this.environment = environment;
    this.packages = {};
  }

  async refresh(): Promise<Package.IPackages> {
    if (this.environment === undefined) {
      this.packages = {};
      return Promise.resolve({});
    }

    try {
      let request: RequestInit = {
        method: "GET"
      };
      // Get all available packages
      let available_pkgs = await requestServer(
        URLExt.join("conda", "packages", this.environment, "available"),
        request
      );
      let all_data = (await available_pkgs.json()) as {
        packages: Array<Package.IPackage>;
      };

      // Get installed packages
      let response = await requestServer(
        URLExt.join("conda", "environments", this.environment),
        request
      );
      let data = (await response.json()) as {
        packages: Array<Package.IRawPackage>;
      };

      // Set installed package status
      //- packages are sorted by name, we take advantage of this.
      let all_packages = all_data.packages;
      let final_list = {};

      let availableIdx = 0;
      let installedIdx = 0;

      while (availableIdx < all_packages.length) {
        let pkg = all_packages[availableIdx];
        pkg.status = Package.PkgStatus.Available;
        if (installedIdx < data.packages.length) {
          let installed = data.packages[installedIdx];
          if (pkg.name > installed.name) {
            // installed is not in available
            pkg = {
              ...installed,
              version: [installed.version],
              build_number: [installed.build_number],
              build_string: [installed.build_string],
              summary: "",
              home: "",
              keywords: [],
              tags: []
            };
            availableIdx -= 1;
          }
          if (pkg.name === installed.name) {
            pkg.version_installed = installed.version;
            pkg.status = Package.PkgStatus.Installed;
            installedIdx += 1;
          }
        }

        let split_url = pkg.channel.split("/");
        if (split_url.length > 2) {
          let firstNotEmpty = 1; // Skip the scheme http, https or file
          while (split_url[firstNotEmpty].length === 0) {
            firstNotEmpty += 1;
          }
          pkg.channel = split_url[firstNotEmpty];
          let pos = split_url.length - 1;
          while (
            Package.PkgSubDirs.indexOf(split_url[pos]) > -1 &&
            pos > firstNotEmpty
          ) {
            pos -= 1;
          }
          if (pos > firstNotEmpty) {
            pkg.channel += "/...";
          }
          pkg.channel += "/" + split_url[pos];
        }
        final_list[pkg.name] = pkg;
        availableIdx += 1;
      }

      this.packages = final_list;

      return final_list;
    } catch (err) {
      throw new Error("An error occurred while retrieving available packages.");
    }
  }

  async install(packages: Array<string>): Promise<any> {
    if (this.environment === undefined || packages.length === 0) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join(
          "conda",
          "environments",
          this.environment,
          "packages",
          "install"
        ),
        request
      );
      let data = await response.json();
      return data;
    } catch (error) {
      throw new Error("An error occurred while installing packages.");
    }
  }

  async develop(path: string): Promise<any> {
    if (this.environment === undefined || path.length === 0) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages: [path] }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join(
          "conda",
          "environments",
          this.environment,
          "packages",
          "develop"
        ),
        request
      );
      let data = await response.json();
      return data;
    } catch (error) {
      throw new Error(
        `An error occurred while installing in development mode package in ${path}.`
      );
    }
  }

  async check_updates(): Promise<{
    updates: Array<Package.UpdateAPI>;
  }> {
    if (this.environment === undefined) {
      return Promise.resolve({ updates: [] });
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages: [] }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join(
          "conda",
          "environments",
          this.environment,
          "packages",
          "check"
        ),
        request
      );
      let data = await response.json();
      return data;
    } catch (error) {
      throw new Error("An error occurred while checking for package updates.");
    }
  }

  async update(packages: Array<string>): Promise<any> {
    if (this.environment === undefined) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join(
          "conda",
          "environments",
          this.environment,
          "packages",
          "update"
        ),
        request
      );
      let data = await response.json();
      return data;
    } catch (error) {
      throw new Error("An error occurred while updating packages.");
    }
  }

  async remove(packages: Array<string>): Promise<any> {
    if (this.environment === undefined) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join(
          "conda",
          "environments",
          this.environment,
          "packages",
          "remove"
        ),
        request
      );
      let data = await response.json();
      return data;
    } catch (error) {
      throw new Error("An error occurred while removing packages.");
    }
  }
}

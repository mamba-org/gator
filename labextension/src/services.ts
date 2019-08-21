import { URLExt, ISettingRegistry } from "@jupyterlab/coreutils";
import { ServerConnection } from "@jupyterlab/services";
import { Token } from "@phosphor/coreutils";
import { IDisposable } from "@phosphor/disposable";
import { ISignal, Signal } from "@phosphor/signaling";

export const IEnvironmentManager = new Token<IEnvironmentManager>(
  "jupyterlab_conda:IEnvironmentManager"
);

/**
 * Interface for the environment manager
 */
export interface IEnvironmentManager extends IDisposable {
  /**
   * Get all available environments
   */
  environments: Promise<Array<Conda.IEnvironment>>;

  /**
   * Get the list of user-defined environment types
   */
  environmentTypes: string[];

  /**
   * Get all packages channels avalaible in the requested environment
   *
   * @param name environment name
   */
  getChannels(name: string): Promise<Conda.IChannels>;

  /**
   * Get packages manager for the given environment
   *
   * @param name name of the environment to work with
   */
  getPackageManager(name: string): Conda.IPackageManager;

  /**
   * Duplicate a given environment
   *
   * @param target name of the environment to be cloned
   * @param name name of the new environment
   */
  clone(target: string, name: string): Promise<void>;

  /**
   * Create a new environment
   *
   * @param name name of the new environment
   * @param type type of environment to create
   */
  create(name: string, type?: string): Promise<void>;

  /**
   * Signal emitted when a environment is changed.
   */
  environmentChanged: ISignal<IEnvironmentManager, Conda.IEnvironmentChange>;

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
  import(name: string, fileContent: string, fileName: string): Promise<void>;

  /**
   * Remove a given environment
   *
   * @param name name of the environment to be removed
   */
  remove(name: string): Promise<void>;
}

export namespace Conda {
  /**
   * Description of the REST API response for each environment
   */
  export interface IEnvironment {
    /**
     * Environment name
     */
    name: string;
    /**
     * Environment path
     */
    dir: string;
    /**
     * Is the environment the default one
     */
    is_default: boolean;
  }

  export interface IEnvironmentChange {
    /**
     * Name of the created environment
     */
    name: string;
    /**
     * Method of environment creation
     */
    type: "clone" | "create" | "import" | "remove";
    /**
     * Source used for the environment action
     *   'create' -> Initial package list
     *   'import' -> Package list imported
     *   'clone' -> Name of the environment cloned
     *   'remove' -> null
     */
    source: string | string[] | null;
  }

  /**
   * Description of the REST API response when requesting the channels
   */
  export interface IChannels {
    /**
     * Mapping channel name and associated URI
     */
    [key: string]: Array<string>;
  }

  /**
   * Interface of the packages service
   */
  export interface IPackageManager {
    /**
     * List of available packages
     */
    packages: Array<Conda.IPackage>;

    /**
     * Environment in which packages are handled
     */
    environment?: string;

    /**
     * Refresh packages list of the environment
     *
     * @param includeAvailable Include available package list
     */
    refresh(includeAvailable?: boolean): Promise<Array<Conda.IPackage>>;

    /**
     * Refresh available package list
     */
    refreshAvailablePackages(): void;

    /**
     * Does the packages have description?
     */
    hasDescription(): boolean;

    /**
     * Install packages
     *
     * @param packages List of packages to be installed
     */
    install(packages: Array<string>): Promise<void>;

    /**
     * Install a package in development mode
     *
     * @param path Path to the package to install in development mode
     */
    develop(path: string): Promise<void>;

    /**
     * Check for updates
     *
     * @returns List of updatable packages
     */
    check_updates(): Promise<Array<string>>;

    /**
     * Update packages
     *
     * @param packages List of packages to be updated
     */
    update(packages: Array<string>): Promise<void>;

    /**
     * Remove packages
     *
     * @param packages List of packages to be removed
     */
    remove(packages: Array<string>): Promise<void>;

    /**
     * Signal emitted when some package actions are executed.
     */
    packageChanged: ISignal<IPackageManager, Conda.IPackageChange>;
  }

  /**
   * Available platforms subpackages
   */
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
    keywords: string;
    tags: string;
    version_installed?: string;
    version_selected?: string;
    updatable?: boolean;
  }

  export interface IPackageChange {
    /**
     * Name of the environment changed
     */
    environment: string;
    /**
     * Package action
     */
    type: "install" | "update" | "remove";
    /**
     * Packages modified
     */
    packages: string[];
  }
}

/**
 * Type of environment that can be created.
 */
interface IType {
  [key: string]: string[];
}

namespace RESTAPI {
  /**
   * Description of the REST API response when loading environments
   */
  export interface IEnvironments {
    /**
     * List of available environments.
     */
    environments: Array<Conda.IEnvironment>;
  }

  /**
   * Package properties returned by conda tools
   */
  export interface IRawPackage {
    /**
     * Package name
     */
    name: string;
    /**
     * Package version
     */
    version: string;
    /**
     * Build number
     */
    build_number: number;
    /**
     * Build string
     */
    build_string: string;
    /**
     * Channel
     */
    channel: string;
    /**
     * Platform
     */
    platform: string;
  }
}

/**
 * Polling interval for accepted tasks
 */
const POLLING_INTERVAL: number = 1000;

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
    const response = await ServerConnection.makeRequest(
      fullUrl,
      request,
      settings
    );
    if (!response.ok) {
      const body = await response.json();
      throw new ServerConnection.ResponseError(response, body.error);
    } else if (response.status === 202) {
      const redirectUrl = response.headers.get("Location") || url;
      // @ts-ignore
      return new Promise(resolve =>
        setTimeout(
          (url: string, settings: RequestInit) =>
            resolve(requestServer(url, settings)),
          POLLING_INTERVAL,
          redirectUrl,
          { method: "GET" }
        )
      );
    }
    return Promise.resolve(response);
  } catch (reason) {
    throw new ServerConnection.NetworkError(reason);
  }
}

/**
 * Conda Environment Manager
 */
export class CondaEnvironments implements IEnvironmentManager {
  constructor(settings?: ISettingRegistry.ISettings) {
    this._environments = new Array<Conda.IEnvironment>();

    if (settings) {
      this._updateEnvironmentTypes(settings);
      settings.changed.connect(
        this._updateEnvironmentTypes,
        this
      );
    }
  }

  public get environments(): Promise<Array<Conda.IEnvironment>> {
    return this.refresh().then(() => {
      return Promise.resolve(this._environments);
    });
  }

  get environmentChanged(): ISignal<
    IEnvironmentManager,
    Conda.IEnvironmentChange
  > {
    return this._environmentChanged;
  }

  getPackageManager(name: string): Conda.IPackageManager {
    return new CondaPackage(name);
  }

  /**
   * Test whether the manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Get the list of packages to install for a given environment type.
   *
   * The returned package list is the input type split with " ".
   *
   * @param type Environment type
   * @returns List of packages to create the environment
   */
  getEnvironmentFromType(type: string): string[] {
    if (type in this._environmentTypes) {
      return this._environmentTypes[type];
    }
    return type.split(" ");
  }

  /**
   * Get the list of user-defined environment types
   */
  get environmentTypes(): string[] {
    return Object.keys(this._environmentTypes);
  }

  /**
   * Load user settings
   *
   * @param settings User settings
   */
  private _updateEnvironmentTypes(settings: ISettingRegistry.ISettings) {
    this._environmentTypes = settings.get("types").composite as IType;
  }

  async getChannels(name: string): Promise<Conda.IChannels> {
    try {
      let request = {
        method: "GET"
      };
      let response = await requestServer(
        URLExt.join("conda", "channels"),
        request
      );
      if (response.ok) {
        let data = await response.json();
        return data["channels"] as Conda.IChannels;
      } else {
        throw new Error(`Fail to get the channels for environment ${name}.`);
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  async clone(target: string, name: string): Promise<void> {
    try {
      let request: RequestInit = {
        body: JSON.stringify({ name, twin: target }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments"),
        request
      );

      if (response.ok) {
        this._environmentChanged.emit({
          name: name,
          source: target,
          type: "clone"
        });
      }
    } catch (err) {
      console.error(err);
      throw new Error('An error occurred while cloning "' + target + '".');
    }
  }

  async create(name: string, type?: string): Promise<void> {
    try {
      const packages: Array<string> = this.getEnvironmentFromType(type || "");

      let request: RequestInit = {
        body: JSON.stringify({ name, packages }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments"),
        request
      );

      if (response.ok) {
        this._environmentChanged.emit({
          name: name,
          source: packages,
          type: "create"
        });
      }
    } catch (err) {
      console.error(err);
      throw new Error('An error occurred while creating "' + name + '".');
    }
  }

  export(name: string): Promise<Response> {
    try {
      let request: RequestInit = {
        method: "GET"
      };
      const args = URLExt.objectToQueryString({ download: 1 });
      return requestServer(
        URLExt.join("conda", "environments", name) + args,
        request
      );
    } catch (err) {
      console.error(err);
      throw new Error(
        'An error occurred while exporting Conda environment "' + name + '".'
      );
    }
  }

  async import(
    name: string,
    fileContent: string,
    fileName: string
  ): Promise<void> {
    try {
      let request: RequestInit = {
        body: JSON.stringify({ name, file: fileContent, filename: fileName }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments"),
        request
      );

      if (response.ok) {
        this._environmentChanged.emit({
          name: name,
          source: fileContent,
          type: "import"
        });
      }
    } catch (err) {
      console.error(err);
      throw new Error('An error occurred while creating "' + name + '".');
    }
  }

  async refresh(): Promise<Array<Conda.IEnvironment>> {
    try {
      let request: RequestInit = {
        method: "GET"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments"),
        request
      );
      let data = (await response.json()) as RESTAPI.IEnvironments;
      this._environments = data.environments;
      return data.environments;
    } catch (err) {
      console.error(err);
      throw new Error("An error occurred while listing Conda environments.");
    }
  }

  async remove(name: string): Promise<void> {
    try {
      let request: RequestInit = {
        method: "DELETE"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", name),
        request
      );

      if (response.ok) {
        this._environmentChanged.emit({
          name: name,
          source: null,
          type: "remove"
        });
      }
    } catch (err) {
      console.error(err);
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
  private _environments: Array<Conda.IEnvironment>;
  private _environmentsTimer = -1;
  private _environmentChanged = new Signal<
    IEnvironmentManager,
    Conda.IEnvironmentChange
  >(this);
  private _environmentTypes: { [key: string]: string[] };
}

export class CondaPackage implements Conda.IPackageManager {
  /**
   * List of packages
   */
  packages: Array<Conda.IPackage>;
  /**
   * Conda environment of interest
   */
  environment?: string;

  constructor(environment?: string) {
    this.environment = environment;
    this.packages = [];
  }

  get packageChanged(): ISignal<Conda.IPackageManager, Conda.IPackageChange> {
    return this._packageChanged;
  }

  /**
   * Refresh the package list.
   *
   * @param includeAvailable Include available package list
   *
   * @returns The package list
   */
  async refresh(
    includeAvailable: boolean = true
  ): Promise<Array<Conda.IPackage>> {
    if (this.environment === undefined) {
      this.packages = [];
      return Promise.resolve([]);
    }

    try {
      const request: RequestInit = {
        method: "GET"
      };

      // Get installed packages
      const response = await requestServer(
        URLExt.join("conda", "environments", this.environment),
        request
      );
      const data = (await response.json()) as {
        packages: Array<RESTAPI.IRawPackage>;
      };
      const installedPkgs = data.packages;

      let all_packages: Array<Conda.IPackage> = [];
      if (includeAvailable) {
        // Get all available packages
        all_packages.push(...(await CondaPackage._getAvailablePackages()));
      }

      // Set installed package status
      //- packages are sorted by name, we take advantage of this.
      let final_list = [];

      let availableIdx = 0;
      let installedIdx = 0;

      while (
        installedIdx < installedPkgs.length ||
        availableIdx < all_packages.length
      ) {
        let installed = installedPkgs[installedIdx];
        let pkg = all_packages[availableIdx] || {
          ...installed,
          version: [installed.version],
          build_number: [installed.build_number],
          build_string: [installed.build_string],
          summary: "",
          home: "",
          keywords: "",
          tags: ""
        };
        pkg.summary = pkg.summary || "";
        // Stringify keywords and tags
        pkg.keywords = (pkg.keywords || "").toString().toLowerCase();
        pkg.tags = (pkg.tags || "").toString().toLowerCase();
        pkg.version_installed = "";
        pkg.version_selected = "none";
        pkg.updatable = false;

        if (installed !== undefined) {
          if (pkg.name > installed.name) {
            // installed is not in available
            pkg = {
              ...installed,
              version: [installed.version],
              build_number: [installed.build_number],
              build_string: [installed.build_string],
              summary: "",
              home: "",
              keywords: "",
              tags: ""
            };
            availableIdx -= 1;
          }
          if (pkg.name === installed.name) {
            pkg.version_installed = installed.version;
            pkg.version_selected = installed.version;
            if (pkg.version.indexOf(installed.version) < 0) {
              pkg.version.push(installed.version);
            }
            installedIdx += 1;
          }
        }

        // Simplify the package channel name
        let split_url = pkg.channel.split("/");
        if (split_url.length > 2) {
          let firstNotEmpty = 0;
          if (
            ["http:", "https:", "file:"].indexOf(split_url[firstNotEmpty]) >= 0
          ) {
            firstNotEmpty = 1; // Skip the scheme http, https or file
          }
          while (split_url[firstNotEmpty].length === 0) {
            firstNotEmpty += 1;
          }
          pkg.channel = split_url[firstNotEmpty];
          let pos = split_url.length - 1;
          while (
            Conda.PkgSubDirs.indexOf(split_url[pos]) > -1 &&
            pos > firstNotEmpty
          ) {
            pos -= 1;
          }
          if (pos > firstNotEmpty) {
            pkg.channel += "/...";
          }
          pkg.channel += "/" + split_url[pos];
        }

        final_list.push(pkg);
        availableIdx += 1;
      }

      this.packages = final_list;

      return final_list;
    } catch (err) {
      console.error(err);
      throw new Error("An error occurred while retrieving available packages.");
    }
  }

  async install(packages: Array<string>): Promise<void> {
    if (this.environment === undefined || packages.length === 0) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "POST"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", this.environment, "packages"),
        request
      );
      if (response.ok) {
        this._packageChanged.emit({
          environment: this.environment,
          type: "install",
          packages
        });
      }
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while installing packages.");
    }
  }

  async develop(path: string): Promise<void> {
    if (this.environment === undefined || path.length === 0) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages: [path] }),
        method: "POST"
      };
      await requestServer(
        URLExt.join("conda", "environments", this.environment, "packages") +
          URLExt.objectToQueryString({ develop: 1 }),
        request
      );
    } catch (error) {
      console.error(error);
      throw new Error(
        `An error occurred while installing in development mode package in ${path}.`
      );
    }
  }

  async check_updates(): Promise<Array<string>> {
    if (this.environment === undefined) {
      return Promise.resolve([]);
    }

    try {
      let request: RequestInit = {
        method: "GET"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", this.environment) +
          URLExt.objectToQueryString({ status: "has_update" }),
        request
      );
      let data = (await response.json()) as {
        updates: Array<RESTAPI.IRawPackage>;
      };
      return data.updates.map(pkg => pkg.name);
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while checking for package updates.");
    }
  }

  async update(packages: Array<string>): Promise<void> {
    if (this.environment === undefined) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "PATCH"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", this.environment, "packages"),
        request
      );

      if (response.ok) {
        this._packageChanged.emit({
          environment: this.environment,
          type: "update",
          packages
        });
      }
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while updating packages.");
    }
  }

  async remove(packages: Array<string>): Promise<void> {
    if (this.environment === undefined) {
      return Promise.resolve();
    }

    try {
      let request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "DELETE"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments", this.environment, "packages"),
        request
      );
      if (response.ok) {
        this._packageChanged.emit({
          environment: this.environment,
          type: "remove",
          packages
        });
      }
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while removing packages.");
    }
  }

  async refreshAvailablePackages(): Promise<void> {
    CondaPackage._getAvailablePackages(true);
  }

  /**
   * Does the available packages have description?
   *
   * @returns description presence
   */
  hasDescription(): boolean {
    return CondaPackage._hasDescription;
  }

  /**
   * Get the available packages list.
   *
   * @param force Force refreshing the available package list
   */
  private static async _getAvailablePackages(
    force: boolean = false
  ): Promise<Array<Conda.IPackage>> {
    if (CondaPackage._availablePackages === null || force) {
      const request: RequestInit = {
        method: "GET"
      };

      const response = await requestServer(
        URLExt.join("conda", "packages"),
        request
      );
      const data = (await response.json()) as {
        packages: Array<Conda.IPackage>;
        with_description: boolean;
      };
      CondaPackage._availablePackages = data.packages;
      CondaPackage._hasDescription = data.with_description || false;
    }
    return Promise.resolve(CondaPackage._availablePackages);
  }

  private _packageChanged: Signal<
    CondaPackage,
    Conda.IPackageChange
  > = new Signal<this, Conda.IPackageChange>(this);
  private static _availablePackages: Array<Conda.IPackage> = null;
  private static _hasDescription: boolean = false;
}

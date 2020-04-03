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
  getPackageManager(name?: string): Conda.IPackageManager;

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
    type: "clone" | "create" | "import" | "remove" | "update";
    /**
     * Source used for the environment action
     *   'create' -> Initial package list
     *   'import' -> Package list imported
     *   'clone' -> Name of the environment cloned
     *   'remove' -> null
     *   'update' -> Update file content
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
     * Environment in which packages are handled
     *
     * TODO remove => better use mandatory environment in args
     */
    environment?: string;

    /**
     * Refresh packages list of the environment
     *
     * @param includeAvailable Include available package list (default true)
     * @param environment Environment name
     */
    refresh(
      includeAvailable?: boolean,
      environment?: string
    ): Promise<Array<Conda.IPackage>>;

    /**
     * Refresh available package list
     */
    refreshAvailablePackages(): Promise<void>;

    /**
     * Does the packages have description?
     */
    hasDescription(): boolean;

    /**
     * Install packages
     *
     * @param packages List of packages to be installed
     * @param environment Environment name
     */
    install(packages: Array<string>, environment?: string): Promise<void>;

    /**
     * Install a package in development mode
     *
     * @param path Path to the package to install in development mode
     * @param environment Environment name
     */
    develop(path: string, environment?: string): Promise<void>;

    /**
     * Check for updates
     *
     * @returns List of updatable packages
     * @param environment Environment name
     */
    check_updates(environment?: string): Promise<Array<string>>;

    /**
     * Update packages
     *
     * @param packages List of packages to be updated
     * @param environment Environment name
     */
    update(packages: Array<string>, environment?: string): Promise<void>;

    /**
     * Remove packages
     *
     * @param packages List of packages to be removed
     * @param environment Environment name
     */
    remove(packages: Array<string>, environment?: string): Promise<void>;

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
    type: "develop" | "install" | "update" | "remove";
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
 * Conda Environment Manager
 */
export class CondaEnvironments implements IEnvironmentManager {
  constructor(settings?: ISettingRegistry.ISettings) {
    this._environments = new Array<Conda.IEnvironment>();

    if (settings) {
      this._updateSettings(settings);
      settings.changed.connect(
        this._updateSettings,
        this
      );

      const clean = new Promise<void>(
        ((resolve: () => void): void => {
          this._clean = resolve;
        }).bind(this)
      );

      clean.then(() => {
        settings.changed.disconnect(this._updateSettings, this);
      });
    }
  }

  get environments(): Promise<Array<Conda.IEnvironment>> {
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

  getPackageManager(name?: string): Conda.IPackageManager {
    this._packageManager.environment = name;
    return this._packageManager;
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
  private _updateSettings(settings: ISettingRegistry.ISettings): void {
    this._environmentTypes = settings.get("types").composite as IType;
    this._whitelist = settings.get("whitelist").composite as boolean;
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
    this._clean();
    this._environments.length = 0;
  }

  async getChannels(name: string): Promise<Conda.IChannels> {
    try {
      const request = {
        method: "GET"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "channels"),
        request
      );
      const response = await promise;
      if (response.ok) {
        const data = await response.json();
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
      const request: RequestInit = {
        body: JSON.stringify({ name, twin: target }),
        method: "POST"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments"),
        request
      );
      const response = await promise;

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

      const request: RequestInit = {
        body: JSON.stringify({ name, packages }),
        method: "POST"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments"),
        request
      );
      const response = await promise;
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
      const request: RequestInit = {
        method: "GET"
      };
      const args = URLExt.objectToQueryString({ download: 1 });
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments", name) + args,
        request
      );
      return promise;
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
      const request: RequestInit = {
        body: JSON.stringify({ name, file: fileContent, filename: fileName }),
        method: "POST"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments"),
        request
      );
      const response = await promise;
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
      const request: RequestInit = {
        method: "GET"
      };
      const queryArgs = {
        whitelist: this._whitelist ? 1 : 0
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments") +
          URLExt.objectToQueryString(queryArgs),
        request
      );
      const response = await promise;
      const data = (await response.json()) as RESTAPI.IEnvironments;
      this._environments = data.environments;
      return data.environments;
    } catch (err) {
      console.error(err);
      throw new Error("An error occurred while listing Conda environments.");
    }
  }

  async remove(name: string): Promise<void> {
    try {
      const request: RequestInit = {
        method: "DELETE"
      };
      const { promise } = await Private.requestServer(
        URLExt.join("conda", "environments", name),
        request
      );
      const response = await promise;
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

  async update(
    name: string,
    fileContent: string,
    fileName: string
  ): Promise<void> {
    try {
      const request: RequestInit = {
        body: JSON.stringify({ file: fileContent, filename: fileName }),
        method: "PATCH"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments", name),
        request
      );
      const response = await promise;
      if (response.ok) {
        this._environmentChanged.emit({
          name: name,
          source: fileContent,
          type: "update"
        });
      }
    } catch (err) {
      console.error(err);
      throw new Error('An error occurred while creating "' + name + '".');
    }
  }

  // Resolve promise to disconnect signals at disposal
  private _clean: () => void = () => {
    return;
  };

  private _packageManager = new CondaPackage();
  private _isDisposed = false;
  private _environments: Array<Conda.IEnvironment>;
  private _environmentsTimer = -1;
  private _environmentChanged = new Signal<
    IEnvironmentManager,
    Conda.IEnvironmentChange
  >(this);
  private _whitelist = false;
  private _environmentTypes: IType = {};
}

export class CondaPackage implements Conda.IPackageManager {
  /**
   * Conda environment of interest
   */
  environment?: string;

  constructor(environment?: string) {
    this.environment = environment;
  }

  get packageChanged(): ISignal<Conda.IPackageManager, Conda.IPackageChange> {
    return this._packageChanged;
  }

  /**
   * Refresh the package list.
   *
   * @param includeAvailable Include available package list
   * @param environment Environment name
   *
   * @returns The package list
   */
  async refresh(
    includeAvailable = true,
    environment?: string
  ): Promise<Array<Conda.IPackage>> {
    const theEnvironment = environment || this.environment;
    if (theEnvironment === undefined) {
      return Promise.resolve([]);
    }

    this._cancelTasks();

    try {
      const request: RequestInit = {
        method: "GET"
      };

      // Get installed packages
      const { promise, cancel } = Private.requestServer(
        URLExt.join("conda", "environments", theEnvironment),
        request
      );
      const idx = this._cancellableStack.push(cancel) - 1;
      const response = await promise;
      this._cancellableStack.splice(idx, 1);
      const data = (await response.json()) as {
        packages: Array<RESTAPI.IRawPackage>;
      };
      const installedPkgs = data.packages;

      const allPackages: Array<Conda.IPackage> = [];
      if (includeAvailable) {
        // Get all available packages
        allPackages.push(...(await this._getAvailablePackages()));
      }

      // Set installed package status
      //- packages are sorted by name, we take advantage of this.
      const finalList = [];

      let availableIdx = 0;
      let installedIdx = 0;

      while (
        installedIdx < installedPkgs.length ||
        availableIdx < allPackages.length
      ) {
        const installed = installedPkgs[installedIdx];
        let pkg = allPackages[availableIdx] || {
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
        const splitUrl = pkg.channel.split("/");
        if (splitUrl.length > 2) {
          let firstNotEmpty = 0;
          if (
            ["http:", "https:", "file:"].indexOf(splitUrl[firstNotEmpty]) >= 0
          ) {
            firstNotEmpty = 1; // Skip the scheme http, https or file
          }
          while (splitUrl[firstNotEmpty].length === 0) {
            firstNotEmpty += 1;
          }
          pkg.channel = splitUrl[firstNotEmpty];
          let pos = splitUrl.length - 1;
          while (
            Conda.PkgSubDirs.indexOf(splitUrl[pos]) > -1 &&
            pos > firstNotEmpty
          ) {
            pos -= 1;
          }
          if (pos > firstNotEmpty) {
            pkg.channel += "/...";
          }
          pkg.channel += "/" + splitUrl[pos];
        }

        finalList.push(pkg);
        availableIdx += 1;
      }

      return finalList;
    } catch (err) {
      if (err === "cancelled") {
        throw new Error(err);
      } else {
        console.error(err);
        throw new Error(
          "An error occurred while retrieving available packages."
        );
      }
    }
  }

  async install(packages: Array<string>, environment?: string): Promise<void> {
    const theEnvironment = environment || this.environment;
    if (theEnvironment === undefined || packages.length === 0) {
      return Promise.resolve();
    }

    try {
      const request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "POST"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments", theEnvironment, "packages"),
        request
      );
      const response = await promise;
      if (response.ok) {
        this._packageChanged.emit({
          environment: theEnvironment,
          type: "install",
          packages
        });
      }
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while installing packages.");
    }
  }

  async develop(path: string, environment?: string): Promise<void> {
    const theEnvironment = environment || this.environment;
    if (theEnvironment === undefined || path.length === 0) {
      return Promise.resolve();
    }

    try {
      const request: RequestInit = {
        body: JSON.stringify({ packages: [path] }),
        method: "POST"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments", theEnvironment, "packages") +
          URLExt.objectToQueryString({ develop: 1 }),
        request
      );
      const response = await promise;
      if (response.ok) {
        this._packageChanged.emit({
          environment: theEnvironment,
          type: "develop",
          packages: [path]
        });
      }
    } catch (error) {
      console.error(error);
      throw new Error(
        `An error occurred while installing in development mode package in ${path}.`
      );
    }
  }

  async check_updates(environment?: string): Promise<Array<string>> {
    const theEnvironment = environment || this.environment;
    if (theEnvironment === undefined) {
      return Promise.resolve([]);
    }

    this._cancelTasks();

    try {
      const request: RequestInit = {
        method: "GET"
      };
      const { promise, cancel } = Private.requestServer(
        URLExt.join("conda", "environments", theEnvironment) +
          URLExt.objectToQueryString({ status: "has_update" }),
        request
      );
      const idx = this._cancellableStack.push(cancel) - 1;
      const response = await promise;
      this._cancellableStack.splice(idx, 1);
      const data = (await response.json()) as {
        updates: Array<RESTAPI.IRawPackage>;
      };
      return data.updates.map(pkg => pkg.name);
    } catch (error) {
      if (error === "cancelled") {
        throw new Error(error);
      } else {
        console.error(error);
        throw new Error(
          "An error occurred while checking for package updates."
        );
      }
    }
  }

  async update(packages: Array<string>, environment?: string): Promise<void> {
    const theEnvironment = environment || this.environment;
    if (theEnvironment === undefined) {
      return Promise.resolve();
    }

    try {
      const request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "PATCH"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments", theEnvironment, "packages"),
        request
      );
      const response = await promise;
      if (response.ok) {
        this._packageChanged.emit({
          environment: theEnvironment,
          type: "update",
          packages
        });
      }
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while updating packages.");
    }
  }

  async remove(packages: Array<string>, environment?: string): Promise<void> {
    const theEnvironment = environment || this.environment;
    if (theEnvironment === undefined) {
      return Promise.resolve();
    }

    try {
      const request: RequestInit = {
        body: JSON.stringify({ packages }),
        method: "DELETE"
      };
      const { promise } = Private.requestServer(
        URLExt.join("conda", "environments", theEnvironment, "packages"),
        request
      );
      const response = await promise;
      if (response.ok) {
        this._packageChanged.emit({
          environment: theEnvironment,
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
    this._getAvailablePackages(true);
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
  private async _getAvailablePackages(
    force = false
  ): Promise<Array<Conda.IPackage>> {
    this._cancelTasks();

    if (CondaPackage._availablePackages === null || force) {
      const request: RequestInit = {
        method: "GET"
      };

      const { promise, cancel } = Private.requestServer(
        URLExt.join("conda", "packages"),
        request
      );
      const idx = this._cancellableStack.push(cancel) - 1;
      const response = await promise;
      this._cancellableStack.splice(idx, 1);
      const data = (await response.json()) as {
        packages: Array<Conda.IPackage>;
        with_description: boolean;
      };
      CondaPackage._availablePackages = data.packages;
      CondaPackage._hasDescription = data.with_description || false;
    }
    return Promise.resolve(CondaPackage._availablePackages);
  }

  /**
   * Cancel optional tasks
   */
  private _cancelTasks(): void {
    if (this._cancellableStack.length > 0) {
      const tasks = this._cancellableStack.splice(
        0,
        this._cancellableStack.length
      );
      tasks.forEach(task => {
        task();
      });
    }
  }

  private _packageChanged: Signal<
    CondaPackage,
    Conda.IPackageChange
  > = new Signal<this, Conda.IPackageChange>(this);
  private _cancellableStack: Array<() => void> = [];
  private static _availablePackages: Array<Conda.IPackage> = null;
  private static _hasDescription = false;
}

namespace Private {
  /**
   * Polling interval for accepted tasks
   */
  const POLLING_INTERVAL = 1000;

  export interface ICancellablePromise<T> {
    promise: Promise<T>;
    cancel: () => void;
  }

  /** Helper functions to carry on python notebook server request
   *
   * @param {string} url : request url
   * @param {RequestInit} request : initialization parameters for the request
   * @returns {ICancellablePromise<Response>} : Cancellable response to the request
   */
  export const requestServer = function(
    url: string,
    request: RequestInit
  ): ICancellablePromise<Response> {
    const settings = ServerConnection.makeSettings();
    const fullUrl = URLExt.join(settings.baseUrl, url);

    let answer: ICancellablePromise<Response>;
    let resolve: (value: Response) => void;
    let reject: (reason?: any) => void;
    let cancelled = false;

    const promise = new Promise<Response>(
      (resolveFromPromise, rejectFromPromise) => {
        resolve = resolveFromPromise;
        reject = rejectFromPromise;
      }
    );

    ServerConnection.makeRequest(fullUrl, request, settings)
      .then(response => {
        if (!response.ok) {
          response.json().then(body => {
            throw new ServerConnection.ResponseError(response, body.error);
          });
        } else if (response.status === 202) {
          const redirectUrl = response.headers.get("Location") || url;

          setTimeout(
            (url: string, settings: RequestInit) => {
              if (cancelled) {
                // If cancelled, tell the backend to delete the task.
                console.debug(`Request cancelled ${url}.`);
                settings = { ...settings, method: "DELETE" };
              }
              answer = requestServer(url, settings);
              answer.promise.then(response => resolve(response));
            },
            POLLING_INTERVAL,
            redirectUrl,
            { method: "GET" }
          );
        } else {
          resolve(response);
        }
      })
      .catch(reason => {
        throw new ServerConnection.NetworkError(reason);
      });

    return {
      promise: promise,
      cancel: (): void => {
        cancelled = true;
        if (answer) {
          answer.cancel();
        }
        reject("cancelled");
      }
    };
  };
}

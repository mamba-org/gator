import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ISignal, Signal } from '@lumino/signaling';
import { Conda, IEnvironmentManager } from '@mamba-org/gator-common';
import {
  fetchEnvironments,
  fetchPackages,
  fetchEnvironmentPackages,
  ICondaStorePackage,
  condaStoreServerStatus,
  cloneEnvironment,
  createEnvironment,
  specifyEnvironment,
  removePackages,
  exportEnvironment,
  removeEnvironment
} from './condaStore';

interface IParsedEnvironment {
  environment: string;
  namespace: string;
}

/**
 * Split a conda-store environment into a namespace name and environment name.
 *
 * @param {string} environment - Name of the environment in the form <namespace>/<environment>
 * @throws {Error} - Thrown if the environment is not defined
 * @return {IParsedEnvironment} Environment and namespace names
 */
function parseEnvironment(environment: string): IParsedEnvironment {
  if (environment !== undefined) {
    const [namespaceName, environmentName] = environment.split('/', 2);
    if (!environmentName) {
      throw new Error(
        'Namespace and environment must be provided together, like so: namespace/environment'
      );
    }
    return {
      environment: environmentName,
      namespace: namespaceName
    };
  } else {
    throw new Error('Environment is undefined.');
  }
}

/**
 * Model for managing conda-store environments.
 * @implements IEnvironmentManager
 */
export class CondaStoreEnvironmentManager implements IEnvironmentManager {
  constructor(settings?: ISettingRegistry.ISettings) {
    if (settings) {
      this.updateSettings(settings);
      settings.changed.connect(this.updateSettings, this);
    }
    return;
  }

  async getServerStatus(): Promise<string> {
    const { status } = await condaStoreServerStatus(this._baseUrl);
    return status;
  }

  get environments(): Promise<Array<Conda.IEnvironment>> {
    return fetchEnvironments(this._baseUrl).then(({ data }) => {
      return data.map(({ name, namespace }) => {
        return {
          name: `${namespace.name}/${name}`,
          dir: '',
          is_default: false
        };
      });
    });
  }

  get environmentTypes(): string[] {
    return ['python3', 'r'];
  }

  getChannels(_name: string): Promise<Conda.IChannels> {
    return;
  }

  /**
   * Get the package manager for the indicated environment.
   *
   * @param {string} [name] - Environment name to be set for the package manager
   * @return {Conda.IPackageManager} Manager for accessing/modifying packages
   */
  getPackageManager(name?: string): Conda.IPackageManager {
    this._packageManager.environment = name;
    this._packageManager.baseUrl = this._baseUrl;
    return this._packageManager;
  }

  /**
   * Clone an existing environment.
   *
   * @param {string} existingName - <namespace>/<environment> name for the
   * existing environment.
   * @param {string} name - <namespace>/<environment> name for new
   * environment, which will be a clone of the existing environment.
   */
  async clone(existingName: string, name: string): Promise<void> {
    const { namespace: existingNamespace, environment: existingEnvironment } =
      parseEnvironment(existingName);
    const { namespace, environment } = parseEnvironment(name);
    await cloneEnvironment(
      this._baseUrl,
      existingNamespace,
      existingEnvironment,
      namespace,
      environment
    );
  }

  /**
   * Create a new environment.
   *
   * @async
   * @param {string} name - <namespace>/<environment> name for the new environment.
   * @param {string} [type] - Type of environment to create; see this.environmentTypes for possible
   * values.
   */
  async create(name: string, type?: string): Promise<void> {
    const { namespace, environment } = parseEnvironment(name);
    const dependencies = type === 'python3' ? ['python'] : [type];
    await createEnvironment(
      this._baseUrl,
      namespace,
      environment,
      dependencies
    );
    return;
  }

  get environmentChanged(): ISignal<
    IEnvironmentManager,
    Conda.IEnvironmentChange
  > {
    return this._environmentChanged;
  }

  /**
   * Export the selected conda-store environment as a YAML file.
   *
   * @async
   * @param {string} name - <namespace>/<environment> name for the new environment.
   * @param {boolean} [fromHistory] - Unused here; kept for compatibility
   * @returns {Promise<Response>} Response with text attribute containing the requested environment yaml
   */
  async export(name: string, fromHistory?: boolean): Promise<Response> {
    const { namespace, environment } = parseEnvironment(name);
    return await exportEnvironment(this._baseUrl, namespace, environment);
  }

  /**
   * Create a new conda-store environment by importing a YAML-formatted environment file.
   *
   * Valid examples of environment files can be found in the conda-store and conda documentation; at
   * a minimum, a valid file must contain a name and a list of conda package dependencies.
   *
   * @async
   * @param {string} name - Name of the namespace/environment name to create.
   * @param {string} fileContent - Raw contents of the file to import.
   * @param {string} fileName - Name of the file to use for import.
   */
  async import(
    name: string,
    fileContent: string,
    fileName: string
  ): Promise<void> {
    const { namespace } = parseEnvironment(name);
    await specifyEnvironment(this._baseUrl, namespace, fileContent);
  }

  async update(
    name: string,
    fileContent: string,
    fileName: string
  ): Promise<void> {
    return;
  }

  /**
   * Remove an environment.
   *
   * @async
   * @param {string} name - <namespace>/<environment> name for environment.
   */
  async remove(name: string): Promise<void> {
    const { namespace, environment } = parseEnvironment(name);
    await removeEnvironment(this._baseUrl, namespace, environment);
    return;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
  }

  updateSettings(settings: ISettingRegistry.ISettings): void {
    this._baseUrl = settings.get('condaStoreUrl').composite as string;
  }

  private _packageManager = new CondaStorePackageManager();
  private _environmentChanged = new Signal<
    IEnvironmentManager,
    Conda.IEnvironmentChange
  >(this);
  private _isDisposed = false;
  private _baseUrl = 'http://localhost:5000';
}

/**
 * Model for managing packages for a single environment.
 */
export class CondaStorePackageManager implements Conda.IPackageManager {
  environment?: string;
  packageChanged: ISignal<Conda.IPackageManager, Conda.IPackageChange>;
  hasMoreInstalledPackages = true;
  installedPage = 1;
  installedPageSize = 100;
  installedPackages: Array<ICondaStorePackage> = [];
  hasMoreAvailablePackages = true;
  availablePage = 1;
  availablePageSize = 100;
  availablePackages: Array<ICondaStorePackage> = [];
  baseUrl = '';
  hasSearchProvider = true;

  constructor(environment?: string) {
    this.environment = environment;
  }

  /**
   * Group ICondaStorePackages together by name.
   *
   * @param {Array<ICondaStorePackage>} pkgs - Array of packages to be grouped.
   * @return {Map<string, Array<ICondaStorePackage>>} Map containing arrays of packages, grouped
   * by name
   */
  groupPackages(
    pkgs: Array<ICondaStorePackage>
  ): Map<string, Array<ICondaStorePackage>> {
    const packages = new Map<string, Array<ICondaStorePackage>>();
    pkgs.forEach(pkg => {
      if (packages.has(pkg.name)) {
        packages.set(pkg.name, [...packages.get(pkg.name), pkg]);
      } else {
        packages.set(pkg.name, [pkg]);
      }
    });
    return packages;
  }

  /**
   * Merge arrays of different versions of a package.
   *
   * If installed packages are given, the name, channel_id, summary, and version will be taken
   * from the first package in that array. Otherwise, the first package from the available
   * packages will be used.
   *
   * @param {Array<ICondaStorePackage>} [installed] - Installed packages
   * @param {Array<ICondaStorePackage>} [available] - Available packages
   * @return {Conda.IPackage} Merged list of packages in the format expected by the UI
   */
  mergePackage(
    installed: Array<ICondaStorePackage> = [],
    available: Array<ICondaStorePackage> = []
  ): Conda.IPackage {
    if (installed.length === 0 && available.length === 0) {
      throw new Error('Cannot merge two arrays of empty packages');
    }

    const versions = [
      ...installed.map(pkg => pkg.version),
      ...available.map(pkg => pkg.version)
    ];
    const build_number = [
      ...installed.map(_pkg => -1),
      ...available.map(_pkg => -1)
    ];
    const build_string = [
      ...installed.map(({ build }) => build),
      ...available.map(({ build }) => build)
    ];

    let name,
      channel_id,
      summary,
      version_installed,
      version_selected,
      updatable;
    if (installed.length > 0) {
      ({
        name,
        channel_id,
        summary,
        version: version_installed
      } = installed[0]);
      version_selected = version_installed;

      if (available.length > 0) {
        updatable =
          this.compareVersions(
            version_installed,
            versions[versions.length - 1]
          ) === -1;
      }
    } else {
      ({ name, channel_id, summary } = available[0]);
      version_installed = undefined;
      version_selected = 'none';
    }

    return {
      name,
      version: versions,
      build_number,
      build_string,
      channel: `${channel_id}`,
      platform: '',
      summary,
      home: '',
      keywords: '',
      tags: '',
      version_installed,
      version_selected,
      updatable
    };
  }

  /**
   * Compare version strings.
   *
   * @param {string} v1 - First version string
   * @param {string} v2 - Second version string
   * @returns {number} 0 if v1 === v2, 1 if v1 > v2, -1 if v2 < v1
   */
  compareVersions(v1: string, v2: string): number {
    return v1.localeCompare(v2, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }

  /**
   * Merge two grouped maps of ICondaStorePackages into a single map, then convert to to
   * IPackages.
   *
   * @param {Array<ICondaStorePackage>} installed - Grouped map of packages
   * @param {Array<ICondaStorePackage>} available - Another grouped map of packages
   * @return {Array<Conda.IPackage>} Map of packages containing entries from both
   * arguments
   */
  mergeConvert(
    installed: Array<ICondaStorePackage> = [],
    available: Array<ICondaStorePackage> = []
  ): Array<Conda.IPackage> {
    const merged: Array<Conda.IPackage> = [];

    const installedMap = this.groupPackages(installed);
    const availableMap = this.groupPackages(available);

    // Push the available packages onto the merged array, combining with the installed
    // packages if necessary
    availableMap.forEach((pkgs, name) => {
      merged.push(this.mergePackage(installedMap.get(name), pkgs));
    });

    // Now append the installed packages which aren't in the array of available packages
    installedMap.forEach((pkgs, name) => {
      if (!availableMap.has(name)) {
        merged.push(this.mergePackage(pkgs));
      }
    });

    return merged;
  }

  /**
   * Load the next page of packages which are available to install.
   *
   * @async
   * @return {Promise<Array<ICondaStorePackage>>} Array of installable conda-store packages
   */
  async loadAvailablePackages(): Promise<Array<ICondaStorePackage>> {
    if (this.hasMoreAvailablePackages) {
      const { count, data } = await fetchPackages(
        this.baseUrl,
        this.availablePage,
        this.availablePageSize
      );
      this.hasMoreAvailablePackages =
        count > this.availablePage * this.availablePageSize;
      this.availablePage += 1;
      this.availablePackages = [...this.availablePackages, ...data];
      return data;
    }
    return [];
  }

  /**
   * Get the next page of installed packages.
   *
   * @async
   * @param {string} environment - Environment for which the installed packages are to be fetched;
   * if none is provided, the current environment is used.
   * @return {Promise<Array<Conda.IPackage>>} Array of installed conda-store packages.
   */
  async getInstalledPackages(
    environment: string = this.environment
  ): Promise<Array<Conda.IPackage>> {
    if (this.hasMoreInstalledPackages) {
      const { environment: envName, namespace: namespaceName } =
        parseEnvironment(environment);
      const { count, data } = await fetchEnvironmentPackages(
        this.baseUrl,
        namespaceName,
        envName,
        this.installedPage,
        this.installedPageSize
      );
      this.hasMoreInstalledPackages =
        count > this.installedPage * this.installedPageSize;
      this.installedPage += 1;
      this.installedPackages = [...this.installedPackages, ...data];
    }
    const { installed } = this.truncate(this.installedPackages, []);
    const packages = this.mergeConvert(installed);
    return packages;
  }

  /**
   * Alphabetically compare two ICondaStorePackages by name.
   *
   * @param {ICondaStorePackage} pkg1 - First package
   * @param {ICondaStorePackage} pkg2 - Second package
   * @return {number} -1 if pkg1.name < pkg2.name; 0 if they are equal, 1 if pkg1.name > pkg2.name
   */
  compareName(pkg1: ICondaStorePackage, pkg2: ICondaStorePackage): number {
    return pkg1.name.localeCompare(pkg2.name);
  }

  /**
   * Load more packages when the user scrolls to the bottom of the package list.
   *
   * @async
   * @param {string} environment - Environment for which the packages should be loaded
   * @return {Promise<Array<Conda.IPackage>>} Updated list of packages with the newest results
   */
  async loadMorePackages(environment?: string): Promise<Array<Conda.IPackage>> {
    if (environment === undefined) {
      if (this.environment === undefined) {
        return [];
      }
      environment = this.environment;
    }

    // If there is more available packages, fetch them.
    if (this.hasMoreAvailablePackages) {
      await this.loadAvailablePackages();
    }
    const lastAvailable =
      this.availablePackages[this.availablePackages.length - 1];

    // Keep loading installed packages until we have enough to be sure we know whether the last
    // available package has been installed or not.
    let lastInstalled =
      this.installedPackages[this.installedPackages.length - 1];
    while (
      this.hasMoreInstalledPackages &&
      (lastInstalled === undefined ||
        this.compareName(lastInstalled, lastAvailable) <= 0)
    ) {
      await this.getInstalledPackages(environment);
      lastInstalled = this.installedPackages[this.installedPackages.length - 1];
    }

    const { installed, available } = this.truncate(
      this.installedPackages,
      this.availablePackages
    );
    return this.mergeConvert(installed, available);
  }

  /**
     * Truncate the installed or available packages for display to the user.
     *
     * If the last installed package name comes after the last available package name, the list of
     * packages shown to the user will not contain all the versions of that package (we haven't fetched
     * enough available packages yet). This function will truncate the list of installed packages
     * to include only those packages which we've also fetched from the list of available packages.
     *
     * If all the packages have been fetched, show everything.
     *
     * @param {Array<ICondaStorePackage>} installed - Installed packages
     * @param {Array<ICondaStorePackage>} available - Available packages
     * @return {{
            installed: Array<ICondaStorePackage>, available: Array<ICondaStorePackage>
        }} Truncated arrays of installed and available packages.
     */
  truncate(
    installed: Array<ICondaStorePackage>,
    available: Array<ICondaStorePackage>
  ): {
    installed: Array<ICondaStorePackage>;
    available: Array<ICondaStorePackage>;
  } {
    // If there are no more packages to fetch, or if there are no installed or no available
    // packages, show all packages.
    if (
      (!this.hasMoreInstalledPackages && !this.hasMoreAvailablePackages) ||
      installed.length === 0 ||
      available.length === 0
    ) {
      return {
        installed,
        available
      };
    } else {
      const lastInstalled = installed[installed.length - 1];
      const lastAvailable = available[available.length - 1];

      const collator = Intl.Collator('en-US', { ignorePunctuation: true });
      if (collator.compare(lastInstalled.name, lastAvailable.name) > 0) {
        // If the installed packages array is too long, filter the extra packages.
        return {
          installed: installed.filter(
            pkg => collator.compare(pkg.name, lastAvailable.name) <= 0
          ),
          available
        };
      } else if (collator.compare(lastInstalled.name, lastAvailable.name) < 0) {
        // If the available packages array is too long, filter the extras. This shouldn't really
        // happen if loadMorePackages is being called because loadMorePackages always
        // fetches installed packages until we can be sure whether the last available
        // package has been installed or not.
        return {
          installed,
          available: available.filter(
            pkg => collator.compare(lastInstalled.name, pkg.name) <= 0
          )
        };
      } else {
        // Here, the last available package has been installed; don't truncate either one.
        return {
          installed,
          available
        };
      }
    }
  }

  /**
   * Refresh the list of conda-store packages.
   *
   * @async
   * @param {boolean} [includeAvailable] - If true, available packages are included; unused here
   * @param {string} [environment] - Name of the environment for which installed packages are to be
   * fetched; if not is provided, the current environment is used.
   * @return {Promise<Array<Conda.IPackage>>} Array of conda packages to be displayed to the user.
   */
  async refresh(
    includeAvailable?: boolean,
    environment?: string
  ): Promise<Array<Conda.IPackage>> {
    if (environment === undefined) {
      if (this.environment === undefined) {
        return [];
      }
      environment = this.environment;
    }

    this.installedPage = 1;
    this.availablePage = 1;
    this.installedPackages = [];
    this.availablePackages = [];
    this.hasMoreInstalledPackages = true;
    this.hasMoreAvailablePackages = true;

    return this.loadMorePackages(environment);
  }

  async refreshAvailablePackages(cancellable?: boolean): Promise<void> {
    return Promise.resolve(void 0);
  }

  hasDescription(): boolean {
    return true;
  }

  async install(packages: Array<string>, environment?: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  async develop(path: string, environment?: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  async check_updates(environment?: string): Promise<Array<string>> {
    return Promise.resolve(void 0);
  }

  async update(packages: Array<string>, environment?: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  /**
   * Remove packages from an environment.
   *
   * @async
   * @param {Array<string>} packages - Packages to remove from the environment
   * @param {string} [environment] - Namespace/environment ti be modified
   */
  async remove(packages: Array<string>, environment?: string): Promise<void> {
    const { namespace, environment: envName } = parseEnvironment(environment);
    await removePackages(this.baseUrl, namespace, envName, packages);
  }

  async getDependencies(
    pkg: string,
    cancellable: boolean
  ): Promise<Conda.IPackageDeps> {
    return;
  }
}

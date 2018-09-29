import { Token } from "@phosphor/coreutils";
import { ServerConnection } from "@jupyterlab/services";
import { URLExt } from "@jupyterlab/coreutils";

export const ICondaEnv = new Token<ICondaEnv>("jupyterlab_nb_conda:ICondaEnv");

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

// class Version {
//   private _str: string;
//   private _epoch: number;
//   private _release: number[];
//   private _prerelease?: [string, number];
//   private _postrelease?: number;
//   private _devrelease?: number;
//   private _cmpkey: number[]; // Comparison keys - taken from Python packaging._cmpkey

//   public constructor(
//     release: number[],
//     epoch?: number,
//     prerelease?: [string, number],
//     postrelease?: number,
//     devrelease?: number
//   ) {
//     this._epoch = epoch === undefined ? 0 : epoch;
//     let lastIndex = 0;
//     let revertedRelease = release.reverse();
//     for (lastIndex = 0; lastIndex < release.length; lastIndex) {
//       if (revertedRelease[lastIndex] > 0) {
//         break;
//       }
//     }

//     this._release = release.slice(0, release.length - 1 - lastIndex);
//     this._prerelease = prerelease;
//     this._postrelease = postrelease;
//     this._devrelease = devrelease;

//     this._str = release.join(".");
//     if (this._epoch !== 0) {
//       this._str = this._epoch + "!" + this._str;
//     }
//     if (this._prerelease !== undefined) {
//       this._str += this._prerelease[0] + this._prerelease[1];
//     }
//     if (this._postrelease !== undefined) {
//       this._str += ".post" + this._postrelease;
//     }
//     if (this._devrelease !== undefined) {
//       this._str += ".dev" + this._devrelease;
//     }

//     // Build comparison keys - taken from Python packaging._cmpkey
//     this._cmpkey = [this._prerelease[1], this._postrelease, this._devrelease];
//     if (
//       this._prerelease === undefined &&
//       this._postrelease === undefined &&
//       this._devrelease !== undefined
//     ) {
//       this._cmpkey[0] = -Infinity;
//     } else if (this._prerelease === undefined) {
//       this._cmpkey[0] = Infinity;
//     }
//     if (this._postrelease === undefined) {
//       this._cmpkey[1] = -Infinity;
//     }
//     if (this._devrelease === undefined) {
//       this._cmpkey[2] = Infinity;
//     }
//   }

//   public get epoch(): number | undefined {
//     return this._epoch;
//   }

//   public get release(): number[] {
//     return this._release;
//   }

//   public get prerelease(): [string, number] | undefined {
//     return this._prerelease;
//   }

//   public get postrelease(): number | undefined {
//     return this._postrelease;
//   }

//   public get devrelease(): number | undefined {
//     return this._devrelease;
//   }

//   /**
//    * toString
//    */
//   public toString(): string {
//     return this._str;
//   }

//   public equals(other: Version): boolean {
//     let releaseEquality = this.release.length === other.release.length;
//     if (releaseEquality) {
//       releaseEquality = this.release.every(
//         (value, idx) => value === other.release[idx]
//       );
//     }
//     return (
//       this.epoch === other.epoch &&
//       releaseEquality &&
//       this._cmpkey.every((value, idx) => value === other._cmpkey[idx])
//     );
//   }

//   public greaterThan(other: Version): boolean {
//     let releaseEquality = this.release.length >= other.release.length;
//     if (releaseEquality) {
//       releaseEquality = other.release.every(
//         (value, idx) => value < this.release[idx]
//       );
//     }
//     return (
//       this.epoch >= other.epoch &&
//       releaseEquality &&
//       this._cmpkey.every((value, idx) => value >= other._cmpkey[idx])
//     );
//   }

//   public lesserThan(other: Version): boolean {
//     let releaseEquality = this.release.length <= other.release.length;
//     if (releaseEquality) {
//       releaseEquality = this.release.every(
//         (value, idx) => value <= other.release[idx]
//       );
//     }
//     return (
//       this.epoch <= other.epoch &&
//       releaseEquality &&
//       this._cmpkey.every((value, idx) => value <= other._cmpkey[idx])
//     );
//   }

//   public static parseVersion(version: string): Version {
//     let pattern = /^([1-9]\d*!)?((0|[1-9]\d*)(\.(0|[1-9]\d*))*)((a|b|rc)(0|[1-9]\d*))?(\.post(0|[1-9]\d*))?(\.dev(0|[1-9]\d*))?$/g;
//     let match = pattern.exec(version);
//     try {
//       return new Version(
//         match[2].split(".").map(level => parseInt(level)),
//         match[1] !== undefined ? parseInt(match[1].slice(0, -1)) : undefined,
//         match[6] !== undefined ? [match[7], parseInt(match[8])] : undefined,
//         match[10] !== undefined ? parseInt(match[10]) : undefined,
//         match[12] !== undefined ? parseInt(match[12]) : undefined
//       );
//     } catch (error) {
//       console.log(error);
//     }
//   }
// }

/* Whitelist of environment to show in the conda package manager. If the list contains
 * only one entry, the environment list won't be shown.
 */
export interface ICondaEnv {
  selectedEnv?: string;
  environments: Promise<Array<EnvironmentsModel.IEnvironment>>;
}

export class EnvironmentsModel implements ICondaEnv {
  public selectedEnv?: string;

  constructor() {
    this.selectedEnv = undefined;
    this._environments = new Array<EnvironmentsModel.IEnvironment>();
  }

  public get environments(): Promise<Array<EnvironmentsModel.IEnvironment>> {
    if (this._environments.length === 0) {
      return this.load().then(envs => {
        this._environments = envs.environments;
        return Promise.resolve(this._environments);
      });
    } else {
      return Promise.resolve(this._environments);
    }
  }

  async getChannels(name: string): Promise<EnvironmentsModel.IChannels> {
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
        return data["channels"] as EnvironmentsModel.IChannels;
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

  async create(
    name: string,
    type?: "python2" | "python3" | "r" | string
  ): Promise<any> {
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

  async import(name: string, fileContent: string) {
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

  async load(): Promise<EnvironmentsModel.IEnvironments> {
    try {
      let request: RequestInit = {
        method: "GET"
      };
      let response = await requestServer(
        URLExt.join("conda", "environments"),
        request
      );
      let data = (await response.json()) as EnvironmentsModel.IEnvironments;
      this._environments = data.environments;
      return data;
    } catch (err) {
      throw new Error("An error occurred while listing Conda environments.");
    }
  }

  async remove(name: string) {
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

  export interface IChannels {
    [key: string]: Array<string>;
  }
}

export class PackagesModel {
  packages: PackagesModel.IPackages;
  environment?: string;

  constructor(environment?: string) {
    this.environment = environment;
    this.packages = {};
    // this.load();
  }

  // Handler is now asynchronous
  // private waitAnswer(response: Response): Promise<Response> {
  //   return new Promise((resolve, reject) => {
  //     if (response.status == 202) {
  //       setTimeout(() => {
  //         requestServer(URLExt.join("conda", "packages", "available"), {
  //           method: "GET"
  //         }).then(response => {
  //           resolve(this.waitAnswer(response));
  //         });
  //       }, 1000);
  //     } else {
  //       resolve(response);
  //     }
  //   });
  // }

  async load(): Promise<PackagesModel.IPackages> {
    if (this.environment === undefined) {
      this.packages = {};
      return Promise.resolve({});
    }

    try {
      let request: RequestInit = {
        method: "GET"
      };
      // Get all available packages
      // let first_reply = await requestServer(
      //   URLExt.join("conda", "packages", "available"),
      //   request
      // );
      // let available_pkgs = await this.waitAnswer(first_reply);
      let available_pkgs = await requestServer(
        URLExt.join("conda", "packages", this.environment, "available"),
        request
      );
      let all_data = (await available_pkgs.json()) as {
        packages: Array<PackagesModel.IPackage>;
      };

      // Get installed packages
      let response = await requestServer(
        URLExt.join("conda", "environments", this.environment),
        request
      );
      let data = (await response.json()) as {
        packages: Array<PackagesModel.IRawPackage>;
      };

      // Set installed package status
      //- packages are sorted by name, we take advantage of this.
      let all_packages = all_data.packages;
      let final_list = {};

      let availableIdx = 0;
      let installedIdx = 0;

      while (availableIdx < all_packages.length) {
        let pkg = all_packages[availableIdx];
        pkg.status = PackagesModel.PkgStatus.Available;
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
            pkg.status = PackagesModel.PkgStatus.Installed;
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
            PackagesModel.PkgSubDirs.indexOf(split_url[pos]) > -1 &&
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

  async conda_install(packages: Array<string>): Promise<any> {
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

  async conda_check_updates(): Promise<{
    updates: Array<PackagesModel.UpdateAPI>;
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

  async conda_update(packages: Array<string>): Promise<any> {
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

  async conda_remove(packages: Array<string>): Promise<any> {
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

export namespace PackagesModel {
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

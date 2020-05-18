import { KernelSpecAPI, KernelSpecManager } from "@jupyterlab/services";
import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { Token } from "@lumino/coreutils";
import { IDisposable } from "@lumino/disposable";
import { INotification } from "jupyterlab_toastify";
import semver from "semver";
import { IEnvironmentManager } from "./tokens";

export const companionID = "jupyterlab_conda:companion";

export const ICompanionValidator = new Token<ICompanionValidator>(
  "jupyterlab_conda:ICompanionValidator"
);

/**
 * Validates that conda packages installed in kernels respect
 * kernel companions version specification.
 *
 * The use case is a JupyterLab version served with pre-installed
 * extensions and not manage possible by the end user. In that case
 * especially for libraries with widgets, the conda package version
 * must be coherent with the labextension pre-installed. Otherwise
 * the model in the kernel will not match the one in the frontend.
 */
export interface ICompanionValidator extends IDisposable {
  /**
   * Validate the kernelSpec models
   *
   * @param specs Available kernelSpec models
   */
  validate(specs: KernelSpecAPI.ISpecModels): void;
}

// Unicode Combining Diacritical Marks
const COMBINING = /[\u0300-\u036F]/g;

type Companions = { [key: string]: string };

/**
 * Validates that conda packages installed in kernels respect
 * kernel companions version specification.
 *
 * The use case is a JupyterLab version served with pre-installed
 * extensions and not manage possible by the end user. In that case
 * especially for libraries with widgets, the conda package version
 * must be coherent with the labextension pre-installed. Otherwise
 * the model in the kernel will not match the one in the frontend.
 *
 */
export class CompanionValidator implements ICompanionValidator {
  constructor(
    kernelManager: KernelSpecManager,
    envManager: IEnvironmentManager,
    settings: ISettingRegistry.ISettings
  ) {
    this._envManager = envManager;

    this._updateCompanions(settings);
    settings.changed.connect(
      this._updateCompanions,
      this
    );

    kernelManager.ready.then(() => {
      this._validateSpecs(kernelManager, kernelManager.specs);
      kernelManager.specsChanged.connect(
        this._validateSpecs,
        this
      );
    });

    const clean = new Promise<void>(
      ((resolve: () => void): void => {
        this._clean = resolve;
      }).bind(this)
    );

    clean.then(() => {
      settings.changed.disconnect(this._updateCompanions, this);
      kernelManager.specsChanged.disconnect(this._validateSpecs, this);
    });
  }

  /**
   * Test whether the validator is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the validator.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._clean();
    this._isDisposed = true;
  }

  /**
   * Load the user settings
   *
   * @param settings Plugin user settings
   */
  private _updateCompanions(settings: ISettingRegistry.ISettings): void {
    this._companions = settings.get("companions").composite as Companions;
  }

  /**
   * Convert a kernel name in conda environment name.
   * This follows nb_conda_kernels naming convention.
   *
   * @param name Conda normalized environment name
   * @returns null if this is not a valid conda environment otherwise the name
   */
  static kernelNameToEnvironment(name: string): string | null {
    const splitted = name.split("-");
    if (splitted[0] === "conda") {
      if (splitted.length >= 4) {
        return splitted[2];
      } else if (splitted.length === 3 && splitted[2] === "root") {
        // This is the root
        return "base";
      }
    }

    return null;
  }

  /**
   * Convert semver specification in conda package specification
   *
   * @param range semver version string
   */
  private static _semverToPython(range: string | null): string | null {
    if (range) {
      return range
        .split("||")
        .map(r => r.split(" ").join(","))
        .join("|");
    }

    return null;
  }

  /**
   * Check the available kernels
   *
   * @param manager A service manager
   * @param specs Available kernelSpec models
   */
  private async _validateSpecs(
    manager: KernelSpecManager, // Needed to connect signal
    specs: KernelSpecAPI.ISpecModels
  ): Promise<void> {
    if (Object.keys(this._companions).length === 0) {
      return;
    }

    const environments = await this._envManager.environments;
    const normalizedNames: { [key: string]: string } = {};
    environments.forEach(env => {
      // Normalization need to match as closely as possible nb_conda_kernels conversion
      const normalized = env.name
        .normalize("NFKD")
        .replace(COMBINING, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      normalizedNames[normalized] = env.name;
    });

    function requestCorrection(
      updates: string[],
      manager: IEnvironmentManager,
      name: string
    ): void {
      INotification.warning(`Environment "${name}" has some inconsistencies.`, {
        buttons: [
          {
            label: "Correct",
            caption: "Correct installed packages",
            callback: (): void => {
              const toastId = INotification.inProgress(
                "Correct the environment."
              );
              manager
                .getPackageManager()
                .install(updates, name)
                .then(() => {
                  INotification.update({
                    toastId,
                    message: "Environment corrected",
                    type: "success",
                    autoClose: 5000
                  });
                })
                .catch(reason => {
                  console.error(reason);
                  INotification.update({
                    toastId,
                    message: "Fail to correct the environment.",
                    type: "error"
                  });
                });
            }
          }
        ]
      });
    }

    // Loop on the kernelSpecs
    for (const spec of Object.keys(specs.kernelspecs)) {
      let environment = specs.kernelspecs[spec].metadata[
        "conda_env_name"
      ] as string;
      if (environment === undefined) {
        const name = CompanionValidator.kernelNameToEnvironment(spec);
        environment = normalizedNames[name];
      }
      if (environment) {
        const packages = await this._envManager
          .getPackageManager()
          .refresh(false, environment);
        const companions = Object.keys(this._companions);
        const updates: string[] = [];
        packages.forEach(pkg => {
          if (
            companions.indexOf(pkg.name) >= 0 &&
            !semver.satisfies(pkg.version_installed, this._companions[pkg.name])
          ) {
            let pythonVersion = CompanionValidator._semverToPython(
              semver.validRange(this._companions[pkg.name])
            );

            if (pythonVersion) {
              if ("<>=".indexOf(pythonVersion[0]) < 0) {
                pythonVersion = "=" + pythonVersion; // prefix with '=' if nothing
              }
              updates.push(pkg.name + pythonVersion);
            }
          }
        });

        if (updates.length > 0) {
          requestCorrection(updates, this._envManager, environment);
        }
      }
    }
  }

  /**
   * Validate the kernelSpec models
   *
   * @param kernelSpecs Available kernelSpec models
   */
  validate(kernelSpecs: KernelSpecAPI.ISpecModels): void {
    this._validateSpecs(null, kernelSpecs);
  }

  private _isDisposed = false;
  private _envManager: IEnvironmentManager;
  private _companions: Companions = {};
  // Resolve promise to disconnect signals at disposal
  private _clean: () => void = () => {
    return;
  };
}

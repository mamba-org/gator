import { Application, IPlugin } from '@lumino/application';

import { IGatorShell, GatorShell } from './shell';

/**
 * The type for all JupyterFrontEnd application plugins.
 *
 * @typeparam T - The type that the plugin `provides` upon being activated.
 */
export type GatorFrontEndPlugin<T> = IPlugin<Gator, T>;

/**
 * Gator is the main application class. It is instantiated once and shared.
 */
export class Gator extends Application<IGatorShell> {
  /**
   * Construct a new App object.
   *
   * @param options The instantiation options for an Gator application.
   */
  constructor(
    options: Application.IOptions<IGatorShell> = { shell: new GatorShell() }
  ) {
    super({
      shell: options.shell
    });
  }

  /**
   * The name of the application.
   */
  readonly name = 'Mamba Navigator';

  /**
   * A namespace/prefix plugins may use to denote their provenance.
   */
  readonly namespace = this.name;

  /**
   * The version of the application.
   */
  readonly version = 'unknown';

  /**
   * Register plugins from a plugin module.
   *
   * @param mod - The plugin module to register.
   */
  registerPluginModule(mod: Gator.IPluginModule): void {
    let data = mod.default;
    // Handle commonjs exports.
    if (!Object.prototype.hasOwnProperty.call(mod, '__esModule')) {
      data = mod as any;
    }
    if (!Array.isArray(data)) {
      data = [data];
    }
    data.forEach(item => {
      try {
        this.registerPlugin(item);
      } catch (error) {
        console.error(error);
      }
    });
  }

  /**
   * Register the plugins from multiple plugin modules.
   *
   * @param mods - The plugin modules to register.
   */
  registerPluginModules(mods: Gator.IPluginModule[]): void {
    mods.forEach(mod => {
      this.registerPluginModule(mod);
    });
  }
}

/**
 * A namespace for Gator statics.
 */
export namespace Gator {
  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value.
   */
  export interface IPluginModule {
    /**
     * The default export.
     */
    default: IPlugin<Gator, any> | IPlugin<Gator, any>[];
  }
}

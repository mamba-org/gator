import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { PageConfig } from '@jupyterlab/coreutils';

import { IGatorShell, GatorShell } from './shell';

/**
 * Gator is the main application class. It is instantiated once and shared.
 */
export class Gator extends JupyterFrontEnd<IGatorShell> {
  /**
   * Construct a new App object.
   *
   * @param options The instantiation options for an Gator application.
   */
  constructor(options: Gator.IOptions = { shell: new GatorShell() }) {
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
   * The JupyterLab application paths dictionary.
   */
  get paths(): JupyterFrontEnd.IPaths {
    return {
      urls: {
        base: PageConfig.getOption('baseUrl'),
        notFound: PageConfig.getOption('notFoundUrl'),
        app: PageConfig.getOption('appUrl'),
        static: PageConfig.getOption('staticUrl'),
        settings: PageConfig.getOption('settingsUrl'),
        themes: PageConfig.getOption('themesUrl'),
        doc: PageConfig.getOption('docUrl'),
        translations: PageConfig.getOption('translationsApiUrl'),
        hubHost: PageConfig.getOption('hubHost') || undefined,
        hubPrefix: PageConfig.getOption('hubPrefix') || undefined,
        hubUser: PageConfig.getOption('hubUser') || undefined,
        hubServerName: PageConfig.getOption('hubServerName') || undefined
      },
      directories: {
        appSettings: PageConfig.getOption('appSettingsDir'),
        schemas: PageConfig.getOption('schemasDir'),
        static: PageConfig.getOption('staticDir'),
        templates: PageConfig.getOption('templatesDir'),
        themes: PageConfig.getOption('themesDir'),
        userSettings: PageConfig.getOption('userSettingsDir'),
        serverRoot: PageConfig.getOption('serverRoot'),
        workspaces: PageConfig.getOption('workspacesDir')
      }
    };
  }

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
   * The instantiation options for an Gator application.
   */
  export type IOptions = JupyterFrontEnd.IOptions<IGatorShell>;

  /**
   * The interface for a module that exports a plugin or plugins as
   * the default value.
   */
  export interface IPluginModule {
    /**
     * The default export.
     */
    default: JupyterFrontEndPlugin<any> | JupyterFrontEndPlugin<any>[];
  }
}

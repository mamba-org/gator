import { CommandRegistry } from '@lumino/commands';
import { IEnvironmentManager } from '../tokens';
import {
  createEnvironment,
  cloneEnvironment,
  exportEnvironment,
  removeEnvironment,
  importEnvironment
} from '../environmentActions';
import { cloneIcon } from '../icon';
import {
  deleteIcon,
  downloadIcon,
  fileUploadIcon
} from '@jupyterlab/ui-components';

export function registerEnvCommands(
  commands: CommandRegistry,
  model: IEnvironmentManager
) {
  commands.addCommand('gator-lab:create-env', {
    label: 'Create Environment',
    execute: async args => {
      const name = args['name'] as string;
      const type = args['type'] as string | undefined;
      const packages = args['packages'] as string[] | undefined;

      const result = await createEnvironment(model, name, type, packages);
      return result;
    }
  });

  commands.addCommand('gator-lab:refresh-envs', {
    label: 'Refresh Environments',
    execute: async () => {
      model.emitRefreshEnvs();
    }
  });

  commands.addCommand('gator-lab:clone-env', {
    icon: cloneIcon,
    label: 'Clone',
    execute: async args => {
      const name = args['name'] as string;

      await cloneEnvironment(model, name);
    }
  });

  commands.addCommand('gator-lab:remove-env', {
    icon: deleteIcon,
    label: 'Remove',
    execute: async args => {
      const name = args['name'] as string;

      await removeEnvironment(model, name);
    }
  });

  commands.addCommand('gator-lab:export-env', {
    icon: downloadIcon,
    label: 'Export',
    execute: async args => {
      const name = args['name'] as string;

      await exportEnvironment(model, name);
    }
  });

  commands.addCommand('gator-lab:import-env', {
    icon: fileUploadIcon,
    label: 'Import',
    execute: async args => {
      const name = args['name'] as string;

      await importEnvironment(model, name);
    }
  });
}

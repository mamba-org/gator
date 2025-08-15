import { CommandRegistry } from '@lumino/commands';
import { IEnvironmentManager } from '../tokens';
import {
  cloneEnvironment,
  exportEnvironment,
  removeEnvironment
} from '../envrionmentActions';
import { cloneIcon } from '../icon';
import { deleteIcon, downloadIcon } from '@jupyterlab/ui-components';

export function registerEnvCommands(
  commands: CommandRegistry,
  model: IEnvironmentManager
) {
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

      model.emitEnvRemoved(name);
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
}

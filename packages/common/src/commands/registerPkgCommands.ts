import { CommandRegistry } from '@lumino/commands';
import { Conda } from '../tokens';
import {
  updateAllPackages,
  applyPackageChanges,
  refreshAvailablePackages as refreshAvailablePkgs,
  deletePackage,
  updatePackage
} from '../packageActions';
import { deleteIcon } from '@jupyterlab/ui-components';

export function registerPkgCommands(
  commands: CommandRegistry,
  pkgModel: Conda.IPackageManager
) {
  commands.addCommand('gator-lab:update-all-packages', {
    label: 'Update All Packages',
    execute: async args => {
      const environment = args['environment'] as string;
      await updateAllPackages(pkgModel, environment);
    }
  });

  commands.addCommand('gator-lab:apply-package-changes', {
    label: 'Apply Package Changes',
    execute: async args => {
      const selectedPackages = args[
        'selectedPackages'
      ] as unknown as Conda.IPackage[];
      const environment = args['environment'] as string;
      await applyPackageChanges(pkgModel, selectedPackages, environment);
    }
  });
  commands.addCommand('gator-lab:refresh-available-packages', {
    label: 'Refresh Available Packages',
    execute: async args => {
      const environment = args['environment'] as string;
      await refreshAvailablePkgs(pkgModel, environment);
    }
  });

  commands.addCommand('gator-lab:remove-pkg', {
    icon: deleteIcon,
    label: 'Remove',
    execute: async args => {
      const packageName = args['name'] as string;
      const environment = args['environment'] as string;
      await deletePackage(pkgModel, packageName, environment);
    }
  });

  commands.addCommand('gator-lab:update-pkg', {
    label: 'Update',
    execute: async args => {
      const packageName = args['name'] as string;
      const environment = args['environment'] as string;
      await updatePackage(pkgModel, packageName, environment);
    }
  });
}

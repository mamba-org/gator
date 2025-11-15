import { CommandRegistry } from '@lumino/commands';
import { Conda } from '../tokens';
import {
  updateAllPackages,
  applyPackageChanges,
  refreshAvailablePackages as refreshAvailablePkgs
} from '../packageActions';

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
}

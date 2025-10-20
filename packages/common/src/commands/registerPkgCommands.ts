import { CommandRegistry } from '@lumino/commands';
import { Conda } from '../tokens';
import {
  updateAllPackages,
  applyPackageChanges,
  refreshAvailablePackages as refreshAvailablePkgs
} from '../packageActions';

export function registerPkgCommands(
  commands: CommandRegistry,
  pkgModel: Conda.IPackageManager,
  selectedPackages: Conda.IPackage[],
  environment: string
) {
  commands.addCommand('gator-lab:update-all-packages', {
    label: 'Update All Packages',
    execute: async () => {;
      await updateAllPackages(pkgModel);
    }
  });

  commands.addCommand('gator-lab:apply-package-changes', {
    label: 'Apply Package Changes',
    execute: async () => {
      await applyPackageChanges(pkgModel, selectedPackages, environment);
    }
  });
  commands.addCommand('gator-lab:refresh-available-packages', {
    label: 'Refresh Available Packages',
    execute: async () => {
      await refreshAvailablePkgs(pkgModel);
    }
  });
}

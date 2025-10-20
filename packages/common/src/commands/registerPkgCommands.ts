import { CommandRegistry } from '@lumino/commands';
import { Conda } from '../tokens';
import {
  updateAllPackages,
  applyPackageChanges,
  cancelPackageChanges,
  refreshAvailablePackages as refreshAvailablePkgs
} from '../packageActions';

export function registerPkgCommands(
  commands: CommandRegistry,
  model: Conda.IPackageManager,
  selectedPackages: Conda.IPackage[],
  environment: string
) {
  commands.addCommand('gator-lab:update-all-packages', {
    label: 'Update All Packages',
    execute: async () => {
      await updateAllPackages(model);
    }
  });

  commands.addCommand('gator-lab:apply-package-changes', {
    label: 'Apply Package Changes',
    execute: async () => {
      await applyPackageChanges(model, selectedPackages, environment);
    }
  });
  commands.addCommand('gator-lab:cancel-package-changes', {
    label: 'Cancel Package Changes',
    execute: () => {
      cancelPackageChanges(selectedPackages);
    }
  });
  commands.addCommand('gator-lab:refresh-available-packages', {
    label: 'Refresh Available Packages',
    execute: async () => {
      await refreshAvailablePkgs(model);
    }
  });
}
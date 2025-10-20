import { Notification, showDialog } from '@jupyterlab/apputils';
import { Conda } from './tokens';

/**
 * Update all packages in an environment
 *
 * @param model Package manager
 * @param environment Environment name
 */
export async function updateAllPackages(
  model: Conda.IPackageManager,
  environment?: string
): Promise<void> {
  const theEnvironment = environment || model.environment;
  if (!theEnvironment) {
    return;
  }

  let toastId = '';
  try {
    const confirmation = await showDialog({
      title: 'Update all',
      body: 'Please confirm you want to update all packages? Conda enforces environment consistency. So maybe only a subset of the available updates will be applied.'
    });

    if (confirmation.button.accept) {
      // Emit started signal
      model.emitPackageAction({
        environment: theEnvironment,
        type: 'update-all',
        status: 'started'
      });

      toastId = Notification.emit('Updating packages', 'in-progress');
      await model.update(['--all'], theEnvironment);

      Notification.update({
        id: toastId,
        message: 'Package updated successfully.',
        type: 'success',
        autoClose: 5000
      });

      // Emit completed signal
      model.emitPackageAction({
        environment: theEnvironment,
        type: 'update-all',
        status: 'completed'
      });
    }
  } catch (error) {
    if (error !== 'cancelled') {
      console.error(error);
      if (toastId) {
        Notification.update({
          id: toastId,
          message: (error as any).message,
          type: 'error',
          autoClose: 0
        });
      } else {
        Notification.error((error as any).message);
      }

      // Emit failed signal
      model.emitPackageAction({
        environment: theEnvironment,
        type: 'update-all',
        status: 'failed',
        details: {
          error: (error as any).message
        }
      });
    } else {
      if (toastId) {
        Notification.dismiss(toastId);
      }
    }
  }
}

/**
 * Apply package changes (remove, update, and install packages)
 *
 * @param model Package manager
 * @param selectedPackages List of packages with pending changes
 * @param environment Environment name
 */
export async function applyPackageChanges(
  model: Conda.IPackageManager,
  selectedPackages: Conda.IPackage[],
  environment?: string
): Promise<void> {
  const theEnvironment = environment || model.environment;
  if (!theEnvironment) {
    return;
  }

  let toastId = '';
  try {
    const confirmation = await showDialog({
      title: 'Packages actions',
      body: 'Please confirm you want to apply the selected actions?'
    });

    if (confirmation.button.accept) {
      // Emit started signal
      model.emitPackageAction({
        environment: theEnvironment,
        type: 'apply-changes',
        status: 'started',
        details: {
          packagesAffected: selectedPackages.length
        }
      });

      toastId = Notification.emit('Starting packages actions', 'in-progress');

      // Get modified pkgs
      const toRemove: Array<string> = [];
      const toUpdate: Array<string> = [];
      const toInstall: Array<string> = [];
      selectedPackages.forEach(pkg => {
        if (pkg.version_installed && pkg.version_selected === 'none') {
          toRemove.push(pkg.name);
        } else if (pkg.updatable && pkg.version_selected === '') {
          toUpdate.push(pkg.name);
        } else {
          toInstall.push(
            pkg.version_selected
              ? pkg.name + '=' + pkg.version_selected
              : pkg.name
          );
        }
      });

      if (toRemove.length > 0) {
        Notification.update({
          id: toastId,
          message: 'Removing selected packages'
        });
        await model.remove(toRemove, theEnvironment);
      }

      if (toUpdate.length > 0) {
        Notification.update({
          id: toastId,
          message: 'Updating selected packages'
        });
        await model.update(toUpdate, theEnvironment);
      }

      if (toInstall.length > 0) {
        Notification.update({
          id: toastId,
          message: 'InstaAlling new packages'
        });
        await model.install(toInstall, theEnvironment);
      }

      Notification.update({
        id: toastId,
        message: 'Package actions successfully done.',
        type: 'success',
        autoClose: 5000
      });

      // Emit completed signal
      model.emitPackageAction({
        environment: theEnvironment,
        type: 'apply-changes',
        status: 'completed',
        details: {
          packagesAffected: selectedPackages.length
        }
      });
    }
  } catch (error) {
    if (error !== 'cancelled') {
      console.error(error);
      if (toastId) {
        Notification.update({
          id: toastId,
          message: (error as any).message,
          type: 'error',
          autoClose: 0
        });
      } else {
        Notification.error((error as any).message);
      }

      // Emit failed signal
      model.emitPackageAction({
        environment: theEnvironment,
        type: 'apply-changes',
        status: 'failed',
        details: {
          packagesAffected: selectedPackages.length,
          error: (error as any).message
        }
      });
    } else {
      if (toastId) {
        Notification.dismiss(toastId);
      }
    }
  }
}

/**
 * Cancel package changes (reset selection state)
 *
 * @param selectedPackages List of packages with pending changes
 */
export function cancelPackageChanges(selectedPackages: Conda.IPackage[]): void {
  selectedPackages.forEach(
    pkg =>
      (pkg.version_selected = pkg.version_installed
        ? pkg.version_installed
        : 'none')
  );
}

/**
 * Refresh the available packages list
 *
 * @param model Package manager
 * @param environment Environment name
 */
export async function refreshAvailablePackages(
  model: Conda.IPackageManager,
  environment?: string
): Promise<void> {
  const theEnvironment = environment || model.environment;
  if (!theEnvironment) {
    return;
  }

  const refreshNotification = Notification.emit(
    `Refreshing available packages for ${theEnvironment}...`,
    'in-progress'
  );

  try {
    // Emit started signal
    model.emitPackageAction({
      environment: theEnvironment,
      type: 'refresh-packages',
      status: 'started'
    });

    await model.refreshAvailablePackages();

    Notification.update({
      id: refreshNotification,
      message: `Available packages refreshed for ${theEnvironment}`,
      type: 'success',
      autoClose: 3000
    });

    // Emit completed signal
    model.emitPackageAction({
      environment: theEnvironment,
      type: 'refresh-packages',
      status: 'completed'
    });
  } catch (error) {
    if ((error as any).message !== 'cancelled') {
      console.error('Error when refreshing the available packages.', error);

      Notification.update({
        id: refreshNotification,
        message: `Failed to refresh available packages for ${theEnvironment}`,
        type: 'error',
        autoClose: 0
      });

      // Emit failed signal
      model.emitPackageAction({
        environment: theEnvironment,
        type: 'refresh-packages',
        status: 'failed',
        details: {
          error: (error as any).message
        }
      });
    } else {
      Notification.dismiss(refreshNotification);
    }
  }
}

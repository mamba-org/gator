import { Notification, showDialog } from '@jupyterlab/apputils';
import { Conda } from './tokens';

/**
 * Update all packages in an environment
 *
 * @param pkgModel Package manager
 * @param environment Environment name
 */
export async function updateAllPackages(
  pkgModel: Conda.IPackageManager,
  environment?: string
): Promise<void> {
  const theEnvironment = environment || pkgModel.environment;
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
      pkgModel.emitPackageAction({
        environment: theEnvironment,
        type: 'update-all',
        status: 'started'
      });

      toastId = Notification.emit('Updating packages', 'in-progress');
      await pkgModel.update(['--all'], theEnvironment);

      Notification.update({
        id: toastId,
        message: 'Packages updated successfully.',
        type: 'success',
        autoClose: 5000
      });

      // Emit completed signal
      pkgModel.emitPackageAction({
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
      pkgModel.emitPackageAction({
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
 * @param pkgModel Package manager
 * @param selectedPackages List of packages with pending changes
 * @param environment Environment name
 * @returns True if the changes were applied successfully, false otherwise
 */
export async function applyPackageChanges(
  pkgModel: Conda.IPackageManager,
  selectedPackages: Conda.IPackage[],
  environment?: string
): Promise<boolean> {
  const theEnvironment = environment || pkgModel.environment;
  if (!theEnvironment) {
    return false;
  }

  let toastId = '';
  try {
    const confirmation = await showDialog({
      title: 'Packages actions',
      body: 'Please confirm you want to apply the selected actions?'
    });

    if (confirmation.button.accept) {
      // Emit started signal
      pkgModel.emitPackageAction({
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
        await pkgModel.remove(toRemove, theEnvironment);
      }

      if (toUpdate.length > 0) {
        Notification.update({
          id: toastId,
          message: 'Updating selected packages'
        });
        await pkgModel.update(toUpdate, theEnvironment);
      }

      if (toInstall.length > 0) {
        Notification.update({
          id: toastId,
          message: 'Installing new packages'
        });
        await pkgModel.install(toInstall, theEnvironment);
      }

      Notification.update({
        id: toastId,
        message:
          'Package actions successfully done for ' + theEnvironment + '.',
        type: 'success',
        autoClose: 5000
      });

      // Emit completed signal
      pkgModel.emitPackageAction({
        environment: theEnvironment,
        type: 'apply-changes',
        status: 'completed',
        details: {
          packagesAffected: selectedPackages.length
        }
      });

      return true;
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
      pkgModel.emitPackageAction({
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

    return false;
  }
}

/**
 * Refresh the available packages list
 *
 * @param pkgModel Package manager
 * @param environment Environment name
 */
export async function refreshAvailablePackages(
  pkgModel: Conda.IPackageManager,
  environment?: string
): Promise<void> {
  const theEnvironment = environment || pkgModel.environment;
  if (!theEnvironment) {
    return;
  }

  const refreshNotification = Notification.emit(
    `Refreshing available packages for ${theEnvironment}...`,
    'in-progress'
  );

  try {
    // Emit started signal
    pkgModel.emitPackageAction({
      environment: theEnvironment,
      type: 'refresh-packages',
      status: 'started'
    });

    await pkgModel.refreshAvailablePackages();

    Notification.update({
      id: refreshNotification,
      message: `Available packages refreshed for ${theEnvironment}`,
      type: 'success',
      autoClose: 3000
    });

    // Emit completed signal
    pkgModel.emitPackageAction({
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
      pkgModel.emitPackageAction({
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

/**
 * Delete a package from an environment
 *
 * @param pkgModel Package manager
 * @param packageName Package name
 * @param environment Environment name
 */
export async function deletePackage(
  pkgModel: Conda.IPackageManager,
  packageName: string,
  environment?: string
): Promise<void> {
  const theEnvironment = environment || pkgModel.environment;
  if (!theEnvironment) {
    return;
  }

  let deleteNotification = '';

  try {
    const confirmation = await showDialog({
      title: 'Delete package',
      body: `Please confirm you want to delete ${packageName}?`
    });

    if (confirmation.button.accept) {
      const deleteNotification = Notification.emit(
        `Deleting package ${packageName} in ${theEnvironment}.`,
        'in-progress'
      );

      await pkgModel.remove([packageName], theEnvironment);

      Notification.update({
        id: deleteNotification,
        message: `Deleted package ${packageName} in ${theEnvironment}`,
        type: 'success',
        autoClose: 3000
      });
    }
} catch (error) {
    if ((error as any).message !== 'cancelled') {
      console.error('Error when deleting the available packages.', error);

      Notification.update({
        id: deleteNotification,
        message: `Failed to delete package ${packageName} in ${theEnvironment}`,
        type: 'error',
        autoClose: 0
      });
    } else {
      Notification.dismiss(deleteNotification);
    }
  }
}

/**
 * Update a package in an environment
 *
 * @param pkgModel Package manager
 * @param packageName Package name
 * @param version Package version
 * @param environment Environment name
 */
export async function updatePackage(
  pkgModel: Conda.IPackageManager,
  packageName: string,
  version?: string,
  environment?: string
): Promise<void> {
  const theEnvironment = environment || pkgModel.environment;
  if (!theEnvironment) {
    return;
  }

  let toastId = '';
  try {
    const confirmation = await showDialog({
      title: 'Update package',
      body: `Please confirm you want to update ${packageName}?`
    });

    if (confirmation.button.accept) {
      toastId = Notification.emit('Updating package', 'in-progress');

      // TODO: Support for package version when updating/modifying,
      // even if it's not the latest version
      const packageSpec = version ? `${packageName}=${version}` : packageName;
      await pkgModel.update([packageSpec], theEnvironment);

      Notification.update({
        id: toastId,
        message: `Package ${packageName} updated successfully.`,
        type: 'success',
        autoClose: 5000
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
    } else {
      if (toastId) {
        Notification.dismiss(toastId);
      }
    }
  }
}

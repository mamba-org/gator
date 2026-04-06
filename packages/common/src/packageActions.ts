import { Notification, showDialog } from '@jupyterlab/apputils';
import {
  formatPreviewErrorForDialog,
  IPreviewJob,
  openPackagePreviewDialog
} from './components/CondaPkgPreview';
import { Conda } from './tokens';

/** Base package name from a conda spec (e.g. `numpy=1.2` -> `numpy`). */
function specBaseName(spec: string): string {
  const idx = spec.search(/[=<>]/);
  return (idx === -1 ? spec : spec.slice(0, idx)).trim();
}

export async function dryRunPreview(
  pkgModel: Conda.IPackageManager,
  action: 'install' | 'remove' | 'update',
  selectedPackages: string[],
  environment?: string
): Promise<boolean> {
  const theEnvironment = environment || pkgModel.environment;

  if (!theEnvironment) {
    return false;
  }
  const toastId = Notification.emit(
    'Previewing package changes',
    'in-progress',
    { autoClose: false }
  );

  let result: Conda.IPreviewTransactionActions;

  try {
    result = await pkgModel.dry_run_preview(
      selectedPackages,
      action,
      theEnvironment
    );
  } catch (error) {
    console.error('Error when previewing package changes: ', error);
    if (error !== 'cancelled') {
      Notification.update({
        id: toastId,
        message: formatPreviewErrorForDialog(error),
        type: 'error',
        autoClose: 5000
      });
    } else {
      Notification.dismiss(toastId);
    }
    return false;
  }

  if (!result.has_side_effects) {
    Notification.update({
      id: toastId,
      message: 'No additional changes needed, applying changes...',
      type: 'success',
      autoClose: 2000
    });
    Notification.dismiss(toastId);

    return true;
  } // when error is present, display in toast when dialog is going to pop up then dismiss the toast
  Notification.dismiss(toastId);

  const previewJob: IPreviewJob[] = [];

  if (selectedPackages.length > 0) {
    previewJob.push({
      section: {
        id: 'preview',
        title: 'Preview package changes',
        requestedPackages: selectedPackages
      },
      promise: Promise.resolve(result)
    });
  }

  const confirmed = await openPackagePreviewDialog({
    title: 'Preview package changes',
    jobs: previewJob,
    acceptLabel: 'Apply'
  });

  return confirmed;
}

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
 * @param skipConfirmation Skip confirmation dialog
 * @returns True if the changes were applied successfully, false otherwise
 */
export async function applyPackageChanges(
  pkgModel: Conda.IPackageManager,
  selectedPackages: Conda.IPackage[],
  environment?: string,
  skipConfirmation = false,
  isDirectUpdate = false
): Promise<boolean> {
  const theEnvironment = environment || pkgModel.environment;
  if (!theEnvironment) {
    return false;
  }

  let toastId = '';
  // Get modified pkgs
  const toRemove: Array<string> = [];
  const toUpdate: Array<string> = [];
  const toInstall: Array<string> = [];
  const skipped: Array<string> = [];

  selectedPackages.forEach(pkg => {
    if (isDirectUpdate) {
      if (pkg.version_installed && pkg.updatable) {
        toUpdate.push(pkg.name);
      } else if (pkg.version_installed && !pkg.updatable) {
        skipped.push(pkg.name);
      } else {
        // New package
        toInstall.push(pkg.name);
      }
    } else {
      if (pkg.version_installed && pkg.version_selected === 'none') {
        toRemove.push(pkg.name);
      } else if (pkg.updatable && pkg.version_selected === '') {
        toUpdate.push(pkg.name);
      } else {
        toInstall.push(
          pkg.version_selected && pkg.version_selected !== 'auto'
            ? pkg.name + '=' + pkg.version_selected
            : pkg.name
        );
      }
    }
  });

  if (skipped.length > 0) {
    const skippedList =
      skipped.length <= 3
        ? skipped.join(', ')
        : `${skipped.slice(0, 3).join(', ')} and ${skipped.length - 3} more`;
    Notification.info(
      `Skipped ${skipped.length} package${
        skipped.length > 1 ? 's' : ''
      } already at latest version: ${skippedList}`,
      { autoClose: 6000 }
    );
  }

  if (
    toRemove.length === 0 &&
    toUpdate.length === 0 &&
    toInstall.length === 0
  ) {
    return false;
  }

  try {
    if (!skipConfirmation) {
      const previewJobs: IPreviewJob[] = [];

      // Can't really use dryRunPreview here since dryRunPreview calls openPackagePreviewDialog
      // Leave as is OR create dryRunPreviewBatch function OR further split up dryRunPreview?
      if (toRemove.length > 0) {
        previewJobs.push({
          section: {
            id: 'remove',
            title: 'Remove packages',
            requestedPackages: toRemove.map(specBaseName)
          },
          promise: pkgModel.dry_run_preview(toRemove, 'remove', theEnvironment)
        });
      }
      if (toUpdate.length > 0) {
        previewJobs.push({
          section: {
            id: 'update',
            title: 'Update packages',
            requestedPackages: toUpdate.map(specBaseName)
          },
          promise: pkgModel.dry_run_preview(toUpdate, 'update', theEnvironment)
        });
      }
      if (toInstall.length > 0) {
        previewJobs.push({
          section: {
            id: 'install',
            title: 'Install packages',
            requestedPackages: toInstall.map(specBaseName)
          },
          promise: pkgModel.dry_run_preview(
            toInstall,
            'install',
            theEnvironment
          )
        });
      }

      const confirmed = await openPackagePreviewDialog({
        title: 'Preview package changes',
        jobs: previewJobs,
        acceptLabel: 'Apply'
      });

      if (!confirmed) {
        return false;
      }
    }

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

    if (toRemove.length > 0) {
      Notification.update({
        id: toastId,
        message: 'Removing selected packages',
        autoClose: false
      });
      await pkgModel.remove(toRemove, theEnvironment);
    }

    if (toUpdate.length > 0) {
      Notification.update({
        id: toastId,
        message: 'Updating selected packages',
        autoClose: false
      });
      await pkgModel.update(toUpdate, theEnvironment);
    }

    if (toInstall.length > 0) {
      Notification.update({
        id: toastId,
        message: 'Installing selected packages',
        autoClose: false
      });
      await pkgModel.install(toInstall, theEnvironment);
    }

    Notification.update({
      id: toastId,
      message: 'Package actions successfully done for ' + theEnvironment + '.',
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
    const confirmed = await dryRunPreview(
      pkgModel,
      'remove',
      [packageName],
      theEnvironment
    );

    if (confirmed) {
      deleteNotification = Notification.emit(
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
      console.error('Error when deleting the package.', error);

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
 * Delete multiple packages from an environment
 *
 * @param pkgModel Package manager
 * @param packages String list of package names
 * @param environment Environment name
 */
export async function deletePackages(
  pkgModel: Conda.IPackageManager,
  packages: string[],
  environment?: string
): Promise<void> {
  const theEnvironment = environment || pkgModel.environment;
  if (!theEnvironment) {
    return;
  }

  let deleteNotification = '';
  let confirmed = false;

  try {
    confirmed = await dryRunPreview(
      pkgModel,
      'remove',
      packages,
      theEnvironment
    );
  } catch (error) {
    if (error !== 'cancelled') {
      console.error('Error when deleting the packages.', error);
    }
  }

  try {
    if (confirmed) {
      deleteNotification = Notification.emit(
        `Deleting ${packages.length} packages in ${theEnvironment}.`,
        'in-progress'
      );

      await pkgModel.remove(packages, theEnvironment);

      Notification.update({
        id: deleteNotification,
        message: `Deleted ${packages.length} packages in ${theEnvironment}`,
        type: 'success',
        autoClose: 3000
      });
    }
  } catch (error) {
    if ((error as any).message !== 'cancelled') {
      console.error('Error when deleting the package.', error);

      Notification.update({
        id: deleteNotification,
        message: `Failed to delete ${packages.length} packages in ${theEnvironment}`,
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
    let confirmed: boolean;

    if (version) {
      // How are we taking into account the version here? I don't think it's being properly processed.
      confirmed = await dryRunPreview(
        pkgModel,
        'install',
        [packageName + '=' + version],
        theEnvironment
      );
    } else {
      confirmed = await dryRunPreview(
        pkgModel,
        'update',
        [packageName],
        theEnvironment
      );
    }

    if (!confirmed) {
      return;
    }

    toastId = Notification.emit('Updating package', 'in-progress', {
      autoClose: false
    });

    if (version) {
      // When a specific version is requested, use conda install
      const packageSpec = `${packageName}=${version}`;
      await pkgModel.install([packageSpec], theEnvironment);
    } else {
      // When no version specified, use conda update
      await pkgModel.update([packageName], theEnvironment);
    }

    Notification.update({
      id: toastId,
      message: `Package ${packageName} updated successfully.`,
      type: 'success',
      autoClose: 5000
    });
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

import { Dialog, Notification, showDialog } from '@jupyterlab/apputils';
import semver from 'semver';
import { IEnvironmentManager, Conda } from './tokens';

function normalizePackages(pkgs: Conda.IPackage[]): Conda.IPackage[] {
  if (!Array.isArray(pkgs)) {
    console.warn('normalizePackages: pkgs is not an array', pkgs);
    return [];
  }

  return pkgs
    .map(p => {
      if (!p) {
        console.warn('normalizePackages: package is null/undefined', p);
        return null;
      }

      return {
        ...p,
        // arrays you rely on in the UI
        version: Array.isArray(p.version)
          ? p.version
          : [String(p.version ?? '')],
        // these might be number/string in raw API; make arrays like your list expects
        build_number: Array.isArray((p as any).build_number)
          ? (p as any).build_number
          : [Number((p as any).build_number ?? 0)],
        build_string: Array.isArray((p as any).build_string)
          ? (p as any).build_string
          : [String((p as any).build_string ?? '')],
        // text fields used by search—force strings
        summary: p.summary ?? '',
        keywords: String(p.keywords ?? '').toLowerCase(),
        tags: String(p.tags ?? '').toLowerCase(),
        // selection flags—always present
        version_installed: p.version_installed ?? '',
        version_selected: p.version_selected ?? 'none',
        updatable: !!p.updatable
      };
    })
    .filter(p => p !== null) as Conda.IPackage[];
}

function markUpdatable(pkgs: Conda.IPackage[]) {
  let hasUpdate = false;
  const list = pkgs.map(p => {
    const copy = { ...p };
    try {
      if (copy.version_installed) {
        const latest = copy.version[copy.version.length - 1];
        if (
          semver.gt(
            semver.coerce(latest)!,
            semver.coerce(copy.version_installed)!
          )
        ) {
          copy.updatable = true;
          hasUpdate = true;
        }
      }
    } catch {
      /* ignore semver quirks */
    }
    return copy;
  });
  return { list, hasUpdate };
}

function isPackageManager(x: unknown): x is Conda.IPackageManager {
  return (
    !!x &&
    typeof (x as Conda.IPackageManager).refresh === 'function' &&
    !!(x as Conda.IPackageManager).stateUpdateSignal
  );
}

/**
 * Prime/refresh the packages view (installed + available) and emit via signal.
 * Use this from commands and also from the panel on mount/env switch.
 */
export async function primePackages(
  modelOrPm: IEnvironmentManager | Conda.IPackageManager,
  envName: string
): Promise<void> {
  console.log('primePackages called: ', modelOrPm, envName);
  const pm = isPackageManager(modelOrPm)
    ? modelOrPm
    : modelOrPm.getPackageManager(envName);

  if (!envName) {
    console.warn('primePackages: envName is undefined');
    return;
  }

  if (!pm || !pm.emitState) {
    console.error('primePackages: package manager is invalid', pm);
    return;
  }

  pm.emitState({
    environment: envName,
    isLoading: true,
    phase: 'starting'
  });

  try {
    // installed (ignored here except you might merge later)
    await pm.refresh(false, envName);

    // available (your UI renders this)
    const available = await pm.refresh(true, envName);
    if (!Array.isArray(available) || available.length === 0) {
      console.warn(
        'primePackages: available is empty or not an array',
        available
      );
      pm.emitState({
        environment: envName,
        isLoading: false,
        phase: 'success',
        packages: [],
        hasUpdate: false,
        hasDescription: pm.hasDescription?.() ?? false
      });
      return;
    }

    const normalized = normalizePackages(available);
    const { list, hasUpdate } = markUpdatable(normalized);

    pm.emitState({
      environment: envName,
      isLoading: false,
      phase: 'success',
      packages: list,
      hasUpdate,
      hasDescription: pm.hasDescription?.() ?? false
    });
  } catch (error) {
    console.error('primePackages error:', error);
    pm.emitState({
      environment: envName,
      isLoading: false,
      phase: 'error',
      message: String(error)
    });
    throw error;
  }
}

export async function applyPackageModification(
  model: IEnvironmentManager,
  envName: string,
  opts: { mode: 'all' | 'selected'; names: string[] }
): Promise<void> {
  console.log('applyPackageModification called: ', model, envName, opts);
  const { mode, names } = opts;

  Notification.emit(
    mode === 'all'
      ? `Applying modifications to all packages in ${envName}`
      : `Modifying ${names.length} package(s) in ${envName}`,
    'in-progress'
  );

  names.forEach(pkg => {
    console.log('pkg', pkg);
  });
}

/**
 * Pass names=[] to mean ALL; or call model.update(['--all'], env).
 */
export async function updatePackagesUnified(
  model: IEnvironmentManager,
  envName: string,
  opts: { mode: 'all' | 'selected'; names: string[] }
): Promise<void> {
  const pm = model.getPackageManager(envName);
  const { mode, names } = opts;

  pm.emitState({
    environment: envName,
    isLoading: true,
    phase: 'starting',
    mode
  });

  const toastId = Notification.emit(
    mode === 'all'
      ? `Updating all packages in ${envName}`
      : `Updating ${names.length} package(s) in ${envName}`,
    'in-progress'
  );

  try {
    if (mode === 'all') {
      await model.getPackageManager(envName).update(['--all'], envName);
    } else {
      await model.getPackageManager(envName).update(names, envName);
    }

    pm.emitState({
      environment: envName,
      isLoading: false,
      phase: 'success',
      mode
    });

    Notification.update({
      id: toastId,
      message: 'Packages updated successfully.',
      type: 'success',
      autoClose: 5000
    });

    await primePackages(model, envName);
  } catch (error) {
    pm.emitState({
      environment: envName,
      isLoading: false,
      phase: 'error',
      mode,
      message: String(error)
    });
    Notification.update({
      id: toastId,
      message: `Error updating packages in ${envName}: ${error}`,
      type: 'error',
      autoClose: 0
    });
    throw error;
  }
}

export async function confirmAndUpdateAll(
  model: IEnvironmentManager,
  envName: string
): Promise<void> {
  if (!envName) {
    return;
  }

  const response = await showDialog({
    title: 'Update all',
    body: 'Please confirm you want to update all packages. Conda enforces environment consistency, so only a subset of updates may be applied.',
    buttons: [Dialog.cancelButton(), Dialog.okButton({ caption: 'Update' })]
  });
  if (!response.button.accept) {
    return;
  }

  await updatePackagesUnified(model, envName, { mode: 'all', names: [] });
}

export async function refreshAvailable(
  model: IEnvironmentManager,
  envName: string
) {
  const pm = model.getPackageManager(envName);
  pm.emitState({
    environment: envName,
    isLoading: true,
    phase: 'starting'
  });
  try {
    await pm.refreshAvailablePackages?.();
    pm.emitState({
      environment: envName,
      isLoading: false,
      phase: 'success'
    });
    await primePackages(model, envName);
  } catch (e) {
    pm.emitState({
      environment: envName,
      isLoading: false,
      phase: 'error',
      message: String(e)
    });
    throw e;
  }
}

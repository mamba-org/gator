import { Conda } from './tokens';

export type PackageSortKey = 'name' | 'channel';
export type PackageSortDirection = 'asc' | 'desc';

export interface IPackageSortState {
  sortBy: PackageSortKey;
  sortDirection: PackageSortDirection;
}

/**
 * Returns a new sorted array based on sort state.
 */
export function sortPackages(
  packages: Conda.IPackage[],
  { sortBy, sortDirection }: IPackageSortState
): Conda.IPackage[] {
  const mult = sortDirection === 'asc' ? 1 : -1;
  const items = [...packages];

  items.sort((a, b) => {
    const aKey =
      sortBy === 'channel'
        ? (a.channel || '').toLowerCase()
        : a.name.toLowerCase();
    const bKey =
      sortBy === 'channel'
        ? (b.channel || '').toLowerCase()
        : b.name.toLowerCase();

    if (aKey < bKey) {
      return -1 * mult;
    }
    if (aKey > bKey) {
      return 1 * mult;
    }

    // Stable-ish secondary sort by name
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    if (aName < bName) {
      return -1;
    }
    if (aName > bName) {
      return 1;
    }

    return 0;
  });

  return items;
}

/**
 * Given current sort state and a clicked column, returns the next sort state.
 */
export function nextSortState(
  current: IPackageSortState,
  column: PackageSortKey
): IPackageSortState {
  if (current.sortBy === column) {
    return {
      sortBy: column,
      sortDirection: current.sortDirection === 'asc' ? 'desc' : 'asc'
    };
  }
  return {
    sortBy: column,
    sortDirection: 'asc'
  };
}

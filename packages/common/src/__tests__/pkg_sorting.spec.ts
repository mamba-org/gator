import { sortPackagesWithSearch, IPackageSortState } from '../packageSorting';
import { Conda } from '../tokens';

describe('sortPackagesWithSearch', () => {
  const createPackage = (
    name: string,
    channel: string = 'conda-forge'
  ): Conda.IPackage => ({
    name,
    channel,
    version: ['1.0.0'],
    build_number: [0],
    build_string: ['build'],
    platform: 'linux-64',
    version_installed: undefined,
    version_selected: 'none',
    updatable: false,
    summary: '',
    keywords: '',
    tags: '',
    home: ''
  });

  describe('with search term', () => {
    it('should prioritize packages starting with search term', () => {
      const packages = [
        createPackage('notebook-utils'),
        createPackage('notebook'),
        createPackage('clean-notebook'),
        createPackage('fps-notebook')
      ];

      const sortState: IPackageSortState = {
        sortBy: 'name',
        sortDirection: 'asc'
      };

      const result = sortPackagesWithSearch(packages, sortState, 'notebook');

      expect(result[0].name).toBe('notebook');
      expect(result[1].name).toBe('notebook-utils');
      // Other matches should come after
      expect(['clean-notebook', 'fps-notebook']).toContain(result[2].name);
      expect(['clean-notebook', 'fps-notebook']).toContain(result[3].name);
    });

    it('should sort packages starting with search term alphabetically', () => {
      const packages = [
        createPackage('notebook-z'),
        createPackage('notebook-a'),
        createPackage('notebook-m')
      ];

      const sortState: IPackageSortState = {
        sortBy: 'name',
        sortDirection: 'asc'
      };

      const result = sortPackagesWithSearch(packages, sortState, 'notebook');

      expect(result[0].name).toBe('notebook-a');
      expect(result[1].name).toBe('notebook-m');
      expect(result[2].name).toBe('notebook-z');
    });

    it('should apply column sorting as secondary priority', () => {
      const packages = [
        createPackage('notebook-b', 'channel-2'),
        createPackage('notebook-a', 'channel-1'),
        createPackage('other-pkg', 'channel-1')
      ];

      const sortState: IPackageSortState = {
        sortBy: 'channel',
        sortDirection: 'asc'
      };

      const result = sortPackagesWithSearch(packages, sortState, 'notebook');

      // notebook packages should come first
      expect(result[0].name).toMatch(/^notebook/);
      expect(result[1].name).toMatch(/^notebook/);
      // Within notebook packages, sorted by channel
      expect(result[0].channel).toBe('channel-1');
      expect(result[1].channel).toBe('channel-2');
    });

    it('should handle case-insensitive search', () => {
        const packages = [
          createPackage('Notebook'),
          createPackage('NOTEBOOK-UTILS'),
          createPackage('notebook-tools')
        ];

        const sortState: IPackageSortState = {
          sortBy: 'name',
          sortDirection: 'asc'
        };

        const result = sortPackagesWithSearch(packages, sortState, 'NOTEBOOK');

        // All start with "notebook" (case-insensitive), so sorted alphabetically
        expect(result[0].name).toBe('Notebook');
        expect(result[1].name).toBe('notebook-tools');
        expect(result[2].name).toBe('NOTEBOOK-UTILS');
      });
  });

  describe('without search term', () => {
    it('should fall back to normal column sorting', () => {
      const packages = [
        createPackage('zebra'),
        createPackage('alpha'),
        createPackage('beta')
      ];

      const sortState: IPackageSortState = {
        sortBy: 'name',
        sortDirection: 'asc'
      };

      const result = sortPackagesWithSearch(packages, sortState);

      expect(result[0].name).toBe('alpha');
      expect(result[1].name).toBe('beta');
      expect(result[2].name).toBe('zebra');
    });

    it('should respect sort direction', () => {
      const packages = [
        createPackage('alpha'),
        createPackage('beta'),
        createPackage('zebra')
      ];

      const sortState: IPackageSortState = {
        sortBy: 'name',
        sortDirection: 'desc'
      };

      const result = sortPackagesWithSearch(packages, sortState);

      expect(result[0].name).toBe('zebra');
      expect(result[1].name).toBe('beta');
      expect(result[2].name).toBe('alpha');
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = sortPackagesWithSearch([], {
        sortBy: 'name',
        sortDirection: 'asc'
      });
      expect(result).toEqual([]);
    });

    it('should handle empty search term', () => {
      const packages = [createPackage('test')];
      const result = sortPackagesWithSearch(packages, {
        sortBy: 'name',
        sortDirection: 'asc'
      }, '');
      expect(result).toEqual(packages);
    });

    it('should handle packages with no matches', () => {
      const packages = [
        createPackage('python'),
        createPackage('numpy'),
        createPackage('pandas')
      ];

      const result = sortPackagesWithSearch(packages, {
        sortBy: 'name',
        sortDirection: 'asc'
      }, 'notebook');

      // Should still be sorted, just no search priority
      expect(result.length).toBe(3);
    });
  });
});
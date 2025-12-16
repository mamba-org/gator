import { HTMLSelect } from '@jupyterlab/ui-components';
import * as React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { style } from 'typestyle';
import { Conda } from '../tokens';
import {
  sortPackages,
  nextSortState,
  IPackageSortState
} from '../packageSorting';

export interface IPackageSelectionListProps {
  packages: Conda.IPackage[];
  selectedPackages: Map<string, string>;
  onTogglePackage: (pkg: Conda.IPackage) => void;
  onVersionChange: (pkg: Conda.IPackage, version: string) => void;
  isLoading?: boolean;
}

export const PackageSelectionList = (
  props: IPackageSelectionListProps
): JSX.Element => {
  const headerRef = React.useRef<HTMLDivElement>(null);
  const listOuterRef = React.useRef<HTMLDivElement>(null);

  const [sortState, setSortState] = React.useState<IPackageSortState>({
    sortBy: 'name',
    sortDirection: 'asc'
  });

  // Sync header scroll with list scroll
  const handleListScroll = React.useCallback(() => {
    if (headerRef.current && listOuterRef.current) {
      headerRef.current.scrollLeft = listOuterRef.current.scrollLeft;
    }
  }, []);

  const sortedPackages = React.useMemo(
    () => sortPackages(props.packages, sortState),
    [props.packages, sortState]
  );

  const renderRow = ({
    index,
    style: rowStyle
  }: ListChildComponentProps<Conda.IPackage[]>) => {
    const pkg = sortedPackages[index];
    const isSelected = props.selectedPackages.has(pkg.name);
    const selectedVersion = props.selectedPackages.get(pkg.name) || 'auto';

    const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      const version = e.target.value;
      // Selecting a version auto-selects the package
      props.onVersionChange(pkg, version);
    };

    return (
      <div className={Style.Row} style={rowStyle}>
        <div className={Style.CheckboxCell}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => props.onTogglePackage(pkg)}
            aria-label={`Select ${pkg.name}`}
          />
        </div>
        <div
          className={Style.NameCell}
          onClick={() => props.onTogglePackage(pkg)}
        >
          {pkg.name}
          {pkg.summary && <div className={Style.Summary}>{pkg.summary}</div>}
        </div>
        <div className={Style.VersionCell}>
          <HTMLSelect
            value={selectedVersion}
            onChange={handleVersionChange}
            aria-label={`Version for ${pkg.name}`}
            onClick={e => e.stopPropagation()}
            style={{ minHeight: '28px' }}
          >
            <option value="auto">auto</option>
            {pkg.version.map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </HTMLSelect>
        </div>
        <div className={Style.ChannelCell}>{pkg.channel || '-'}</div>
      </div>
    );
  };

  if (props.isLoading) {
    return <div className={Style.Loading}>Loading packages...</div>;
  }

  if (props.packages.length === 0) {
    return <div className={Style.Empty}>No packages found</div>;
  }

  return (
    <div className={Style.Container}>
      {/* Header with synced scroll (hidden scrollbar) */}
      <div className={Style.HeaderWrapper} ref={headerRef}>
        <div className={Style.HeaderRow}>
          <div className={Style.CheckboxCell}></div>
          <div
            className={Style.HeaderNameCell}
            role="button"
            onClick={() => setSortState(prev => nextSortState(prev, 'name'))}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            Name
            <button
              className={Style.SortButton}
              aria-label={
                sortState.sortBy === 'name'
                  ? `Sort by name (${
                      sortState.sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                    })`
                  : 'Sort by name'
              }
            >
              {sortState.sortBy === 'name'
                ? sortState.sortDirection === 'asc'
                  ? '▲'
                  : '▼'
                : '⇅'}
            </button>
          </div>
          <div className={Style.HeaderVersionCell}>Version</div>
          <div
            className={Style.HeaderChannelCell}
            role="button"
            onClick={() => setSortState(prev => nextSortState(prev, 'channel'))}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            Channel
            <button
              className={Style.SortButton}
              aria-label={
                sortState.sortBy === 'channel'
                  ? `Sort by channel (${
                      sortState.sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                    })`
                  : 'Sort by channel'
              }
            >
              {sortState.sortBy === 'channel'
                ? sortState.sortDirection === 'asc'
                  ? '▲'
                  : '▼'
                : '⇅'}
            </button>
          </div>
        </div>
      </div>

      <div className={Style.ListContainer}>
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <FixedSizeList
              height={height}
              itemCount={sortedPackages.length}
              itemSize={44}
              width={Math.max(width, 500)}
              outerRef={listOuterRef}
              onScroll={handleListScroll}
              itemData={sortedPackages}
            >
              {renderRow}
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

namespace Style {
  export const Container = style({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    minHeight: 0,
    overflow: 'hidden'
  });

  export const HeaderWrapper = style({
    overflowX: 'auto',
    overflowY: 'hidden',
    flexShrink: 0,
    scrollbarWidth: 'none',
    $nest: {
      '&::-webkit-scrollbar': {
        display: 'none'
      }
    }
  });

  export const HeaderRow = style({
    display: 'flex',
    alignItems: 'center',
    padding: '8px 8px',
    borderBottom: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    fontWeight: 600,
    fontSize: '12px',
    color: 'var(--jp-ui-font-color1)',
    flexShrink: 0,
    minWidth: '500px'
  });

  export const ListContainer = style({
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'hidden'
  });

  export const HeaderNameCell = style({
    flex: '1 1 auto',
    minWidth: '150px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  });

  export const HeaderVersionCell = style({
    width: '130px',
    flexShrink: 0,
    textAlign: 'left'
  });

  export const HeaderChannelCell = style({
    width: '120px',
    flexShrink: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  });

  export const SortIcon = style({
    marginLeft: '6px',
    fontSize: '10px',
    color: 'var(--jp-ui-font-color2)'
  });

  export const Row = style({
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderBottom: '1px solid var(--jp-border-color2)',
    cursor: 'pointer',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color2)'
      }
    }
  });

  export const CheckboxCell = style({
    width: '40px',
    flexShrink: 0
  });

  export const NameCell = style({
    flex: '1 1 auto',
    minWidth: '150px',
    overflow: 'hidden'
  });

  export const Summary = style({
    fontSize: '0.85em',
    color: 'var(--jp-ui-font-color2)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  });

  export const VersionCell = style({
    width: '130px',
    flexShrink: 0,
    $nest: {
      '& .jp-HTMLSelect': {
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        maxWidth: '100%'
      },
      '& .jp-HTMLSelect select': {
        appearance: 'none',
        padding: '6px 32px 6px 12px',
        fontSize: '13px',
        fontWeight: 400,
        color: 'var(--jp-ui-font-color1)',
        backgroundColor: 'var(--jp-layout-color1)',
        border: '1px solid var(--jp-border-color2)',
        borderRadius: '6px',
        cursor: 'pointer',
        width: '120px',
        maxWidth: '120px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textTransform: 'capitalize',
        $nest: {
          '&:hover': {
            borderColor: 'var(--jp-border-color1)'
          },
          '&:focus': {
            outline: 'none',
            borderColor: 'var(--jp-brand-color1)'
          }
        }
      },
      '& .jp-HTMLSelect > span': {
        display: 'none'
      },
      '& .jp-HTMLSelect::after': {
        content: '""',
        position: 'absolute',
        right: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        height: '60%',
        width: '1px',
        backgroundColor: 'var(--jp-border-color2)',
        pointerEvents: 'none'
      },
      '& .jp-HTMLSelect::before': {
        content: '""',
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-70%) rotate(45deg)',
        width: '6px',
        height: '6px',
        borderRight: '2px solid var(--jp-ui-font-color2)',
        borderBottom: '2px solid var(--jp-ui-font-color2)',
        pointerEvents: 'none'
      }
    }
  });

  export const ChannelCell = style({
    width: '120px',
    flexShrink: 0,
    fontSize: '12px',
    color: 'var(--jp-ui-font-color2)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  });

  export const SortButton = style({
    padding: 0,
    marginLeft: '10px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'var(--jp-ui-font-color2)',
    fontSize: '10px',
    lineHeight: 1,
    $nest: {
      '&:hover': {
        color: 'var(--jp-ui-font-color0)'
      },
      '&:focus': {
        outline: 'none'
      }
    }
  });

  export const Loading = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--jp-ui-font-color2)'
  });

  export const Empty = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--jp-ui-font-color2)'
  });
}

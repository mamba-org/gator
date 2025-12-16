import * as React from 'react';
import { style, classes } from 'typestyle';
import { IPackageSortState, PackageSortKey } from '../packageSorting';

interface ISortableHeaderProps {
  label: string;
  column: PackageSortKey;
  sortState: IPackageSortState;
  onToggle: (column: PackageSortKey) => void;
  className?: string;
}

export const SortableHeader: React.FC<ISortableHeaderProps> = ({
  label,
  column,
  sortState,
  onToggle,
  className
}) => {
  const isActive = sortState.sortBy === column;
  const icon = isActive ? (sortState.sortDirection === 'asc' ? '▲' : '▼') : '⇅';

  const ariaSort: React.AriaAttributes['aria-sort'] = isActive
    ? sortState.sortDirection === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(column);
    }
  };

  return (
    <div
      className={classes(className, Style.SortableHeader)}
      role="columnheader"
      tabIndex={0}
      aria-sort={ariaSort}
      aria-label={`Sort by ${label.toLowerCase()}`}
      onClick={() => onToggle(column)}
      onKeyDown={handleKeyDown}
    >
      {label}
      <span className={Style.SortIcon}>{icon}</span>
    </div>
  );
};

namespace Style {
  export const SortableHeader = style({
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  });

  export const SortIcon = style({
    marginLeft: '6px',
    fontSize: '10px',
    color: 'var(--jp-ui-font-color2)'
  });
}

import { InputGroup } from '@jupyterlab/ui-components';
import {
  ToolbarButtonComponent,
  addIcon,
  deleteIcon
} from '@jupyterlab/ui-components';
import * as React from 'react';
import { classes, style } from 'typestyle/lib';
import { CONDA_PACKAGES_TOOLBAR_CLASS } from '../constants';
import { undoIcon } from '../icon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PACKAGE_TOOLBAR_HEIGHT = 40;

export enum PkgFilters {
  Installed = 'INSTALLED',
  Available = 'AVAILABLE',
  Updatable = 'UPDATABLE',
  Selected = 'SELECTED'
}

export interface ICondaPkgToolBarProps {
  /**
   * Is the list loading?
   */
  isPending: boolean;
  /**
   * Selected package filter
   */
  category: PkgFilters;
  /**
   * Available channels
   */
  availableChannels: string[];
  /**
   * Which channels are selected
   */
  selectedChannels: string[];
  /**
   * Handler for when the selected channels change
   */
  onSelectedChannelsChanged: (channels: string[]) => void;
  /**
   * Are there some package modifications?
   */
  hasSelection: boolean;
  /**
   * Are there some packages updatable?
   */
  hasUpdate: boolean;
  /**
   * Search term in search box
   */
  searchTerm: string;
  /**
   * Filter category change handler
   */
  onCategoryChanged: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  /**
   * Search box handler
   */
  onSearch: (event: React.FormEvent) => void;
  /**
   * Update all packages handler
   */
  onUpdateAll: () => void;
  /**
   * Delete selected packages handler
   */
  onDeleteSelected: () => void;
  /**
   * Apply package modifications
   */
  onApply: () => void;
  /**
   * Cancel package modifications
   */
  onCancel: () => void;
  /**
   * Refresh available packages handler
   */
  onRefreshPackages: () => void;
  /**
   * Add package handler (opens the package drawer)
   */
  onAddPackages: () => void;
  /**
   * Whether to use direct package actions (immediate update on version change)
   */
  useDirectPackageActions?: boolean;
  /**
   * Toggle between direct and batch mode
   */
  onToggleDirectActions?: () => void;
  /**
   * Number of selected packages
   */
  selectedCount: number;
  /**
   * Total number of installed packages
   */
  installedCount: number;
}

export const CondaPkgToolBar = (props: ICondaPkgToolBarProps): JSX.Element => {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const statusFilterCount = props.category === PkgFilters.Installed ? 0 : 1;
  const channelFilterCount = props.selectedChannels.length;
  const activeFilterCount = statusFilterCount + channelFilterCount;
  const isActive = activeFilterCount > 0;
  const badgeLabel = activeFilterCount > 9 ? '9+' : String(activeFilterCount);

  const toggleFilterPopover = (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsFilterOpen(open => !open);
  };

  const handleStatusClick =
    (value: PkgFilters) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      props.onCategoryChanged({
        target: { value }
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  return (
    <div className={`lm-Widget ${CONDA_PACKAGES_TOOLBAR_CLASS} jp-Toolbar`}>
      <div className="lm-Widget jp-Toolbar-item">
        <div className={classes('jp-NbConda-search-wrapper', Style.Search)}>
          <InputGroup
            className={Style.SearchInput}
            type="text"
            placeholder="Search Packages"
            onChange={props.onSearch}
            value={props.searchTerm}
            rightIcon="search"
          />
        </div>
      </div>
      {props.hasSelection && (props.useDirectPackageActions ?? true) && (
        <>
          <span className={Style.SelectionCount}>
            {props.selectedCount} / {props.installedCount} selected
          </span>
          <ToolbarButtonComponent
            label="Update"
            tooltip="Update selected packages"
            onClick={props.onApply}
            enabled={true}
            className={Style.PrimaryButton}
            dataset={{ 'data-action': 'apply-updates' }}
          />
          <ToolbarButtonComponent
            icon={deleteIcon}
            label="Remove"
            tooltip="Remove selected packages"
            onClick={props.onDeleteSelected}
            enabled={true}
            className={Style.RemoveButton}
            dataset={{ 'data-action': 'remove-selected' }}
          />
          <ToolbarButtonComponent
            label="Clear"
            icon={undoIcon}
            tooltip="Clear selected packages"
            onClick={props.onCancel}
            enabled={true}
            className={Style.ClearButton}
            dataset={{ 'data-action': 'clear-selection' }}
          />
        </>
      )}
      {props.hasSelection && !(props.useDirectPackageActions ?? true) && (
        <>
          <ToolbarButtonComponent
            label="Apply"
            tooltip="Apply package modifications"
            onClick={props.onApply}
            enabled={true}
            className={Style.PrimaryButton}
            dataset={{ 'data-action': 'apply-modifications' }}
          />
          <ToolbarButtonComponent
            label="Clear"
            icon={undoIcon}
            tooltip="Clear package modifications"
            onClick={props.onCancel}
            enabled={true}
            className={Style.ClearButton}
          />
        </>
      )}
      <div className="lm-Widget jp-Toolbar-spacer jp-Toolbar-item" />
      <ToolbarButtonComponent
        label="Update All"
        tooltip="Update all packages"
        onClick={props.onUpdateAll}
        enabled={props.hasUpdate}
        dataset={{ 'data-action': 'update-all' }}
        className={Style.OutlinedButton}
      />
      <ToolbarButtonComponent
        icon={addIcon}
        label="Packages"
        tooltip="Add packages"
        onClick={props.onAddPackages}
        dataset={{ 'data-action': 'add-packages' }}
        className={Style.PrimaryButton}
      />
      <div
        className={classes(
          'lm-Widget jp-Toolbar-item',
          isActive ? Style.FilterWrapperActive : Style.FilterWrapper
        )}
        onClick={toggleFilterPopover}
        title={
          isActive ? `Filters active (${activeFilterCount})` : 'Filter packages'
        }
      >
        <FontAwesomeIcon
          icon="filter"
          className={isActive ? Style.FilterIconActive : Style.FilterIcon}
        />
        {isActive && <span className={Style.FilterBadge}>{badgeLabel}</span>}

        {isFilterOpen && (
          <div
            ref={popoverRef}
            className={Style.FilterPopover}
            onClick={e => e.stopPropagation()}
          >
            <div className={Style.FilterPopoverHeader}>Filter packages</div>

            <div className={Style.FilterSectionLabel}>Status</div>
            <div className={Style.StatusList}>
              <button
                type="button"
                className={classes(
                  Style.StatusPill,
                  props.category === PkgFilters.Installed &&
                    Style.StatusPillActive
                )}
                onClick={handleStatusClick(PkgFilters.Installed)}
              >
                Installed
              </button>
              <button
                type="button"
                className={classes(
                  Style.StatusPill,
                  props.category === PkgFilters.Updatable &&
                    Style.StatusPillActive
                )}
                onClick={handleStatusClick(PkgFilters.Updatable)}
              >
                Updatable
              </button>
              <button
                type="button"
                className={classes(
                  Style.StatusPill,
                  props.category === PkgFilters.Selected &&
                    Style.StatusPillActive
                )}
                onClick={handleStatusClick(PkgFilters.Selected)}
              >
                Selected
              </button>
            </div>

            {props.availableChannels.length > 0 && (
              <>
                <div className={Style.FilterSectionLabel}>Channels</div>

                <label className={Style.ChannelRow}>
                  <input
                    type="checkbox"
                    value="__ALL__"
                    checked={props.selectedChannels.length === 0}
                    onChange={event => {
                      const { checked } = event.target as HTMLInputElement;
                      if (checked) {
                        props.onSelectedChannelsChanged([]);
                      }
                    }}
                  />
                  <span className={Style.ChannelLabel}>All channels</span>
                </label>

                <div className={Style.ChannelList}>
                  {props.availableChannels.map(channel => (
                    <label key={channel} className={Style.ChannelRow}>
                      <input
                        type="checkbox"
                        value={channel}
                        checked={props.selectedChannels.includes(channel)}
                        onChange={event => {
                          const { checked, value } =
                            event.target as HTMLInputElement;
                          const current = props.selectedChannels;
                          const next = checked
                            ? Array.from(new Set([...current, value]))
                            : current.filter(c => c !== value);

                          props.onSelectedChannelsChanged(next);
                        }}
                      />
                      <span className={Style.ChannelLabel}>{channel}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className={Style.FilterPopoverFooter}>
              <button
                type="button"
                className={Style.FilterPopoverClear}
                onClick={() => {
                  props.onSelectedChannelsChanged([]);
                  props.onCategoryChanged({
                    target: { value: PkgFilters.Installed }
                  } as unknown as React.ChangeEvent<HTMLSelectElement>);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className={Style.FilterPopoverDone}
                onClick={() => setIsFilterOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      {props.onToggleDirectActions && (
        <ToolbarButtonComponent
          label={props.useDirectPackageActions ?? true ? 'Direct' : 'Batch'}
          tooltip={
            props.useDirectPackageActions ?? true
              ? 'Direct mode: Changes apply immediately. Click to switch to batch mode.'
              : 'Batch mode: Queue changes and apply together. Click to switch to direct mode.'
          }
          onClick={props.onToggleDirectActions}
          className={Style.ModeToggle}
        />
      )}
    </div>
  );
};

namespace Style {
  export const ModeToggle = style({
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '4px',
    padding: '2px 8px',
    $nest: {
      '& .jp-ToolbarButtonComponent-label': {
        color: 'var(--jp-ui-font-color2)',
        fontSize: 'var(--jp-ui-font-size0)'
      },
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color2)',
        borderColor: 'var(--jp-border-color1)'
      }
    }
  });

  export const SearchInput = style({
    lineHeight: 'normal'
  });

  export const Search = style({
    padding: '4px'
  });

  export const PrimaryButton = style({
    backgroundColor: 'var(--jp-brand-color1)',
    color: 'var(--jp-ui-inverse-font-color1)',
    border: 'none',
    borderRadius: '4px',
    padding: '2px 8px',
    overflow: 'hidden',
    $nest: {
      '& .jp-ToolbarButtonComponent-label': {
        color: 'var(--jp-ui-inverse-font-color1)'
      },
      '& svg': {
        fill: 'var(--jp-ui-inverse-font-color1) !important'
      },
      '& svg path': {
        fill: 'var(--jp-ui-inverse-font-color1) !important'
      },
      '& .jp-icon3': {
        fill: 'var(--jp-ui-inverse-font-color1) !important'
      },
      '&:hover': {
        backgroundColor: 'var(--jp-brand-color2)'
      }
    }
  });

  export const OutlinedButton = style({
    gap: '6px',
    color: 'var(--jp-ui-font-color1)',
    border: '1px solid var(--jp-border-color1)',
    backgroundColor: 'transparent',
    borderRadius: '6px',
    padding: '2px 6px',
    cursor: 'pointer',
    $nest: {
      '& .jp-ToolbarButtonComponent-label': {
        color: 'var(--jp-ui-font-color1)'
      },
      '& .jp-icon3, & svg, & svg path': {
        fill: 'var(--jp-ui-font-color1)'
      },
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color2)'
      }
    }
  });

  export const RemoveButton = style({
    backgroundColor: 'var(--jp-error-color1)',
    border: 'none',
    borderRadius: '4px',
    padding: '2px 8px',
    gap: '4px',
    $nest: {
      '& .jp-ToolbarButtonComponent-label': {
        color: 'white'
      },
      '& svg': {
        fill: 'white !important'
      },
      '& svg path': {
        fill: 'white !important'
      },
      '& .jp-icon3': {
        fill: 'white !important'
      }
    }
  });

  export const ClearButton = style({
    backgroundColor: 'var(--jp-layout-color3)',
    border: 'none',
    borderRadius: '4px',
    padding: '2px 8px',
    $nest: {
      '& .jp-ToolbarButtonComponent-label': {
        color: 'var(--jp-ui-font-color1)',
        marginLeft: '4px'
      }
    }
  });

  export const FilterWrapper = style({
    position: 'relative',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  });

  export const FilterWrapperActive = style({
    position: 'relative',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    paddingRight: '4px',
    cursor: 'pointer'
  });

  export const FilterIcon = style({
    color: 'var(--jp-ui-font-color2)'
  });

  export const FilterIconActive = style({
    color: 'var(--jp-brand-color1)'
  });

  export const FilterBadge = style({
    minWidth: '14px',
    height: '14px',
    borderRadius: '999px',
    padding: '0 4px',
    fontSize: '9px',
    lineHeight: '14px',
    textAlign: 'center',
    backgroundColor: 'var(--jp-brand-color1)',
    color: 'var(--jp-ui-inverse-font-color1)',
    fontWeight: 600
  });

  export const SelectionCount = style({
    color: 'var(--jp-ui-font-color2)',
    fontSize: 'var(--jp-ui-font-size0)',
    marginRight: '8px'
  });

  export const FilterPopover = style({
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    zIndex: 10,
    minWidth: '180px',
    maxWidth: '220px',
    padding: '8px',
    backgroundColor: 'var(--jp-layout-color1)',
    border: '1px solid var(--jp-border-color1)',
    borderRadius: '4px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
  });

  export const FilterPopoverHeader = style({
    fontSize: 'var(--jp-ui-font-size0)',
    fontWeight: 600,
    color: 'var(--jp-ui-font-color1)',
    marginBottom: '4px'
  });

  export const ChannelList = style({
    maxHeight: '160px',
    overflowY: 'auto',
    marginTop: '4px',
    marginBottom: '4px'
  });

  export const ChannelRow = style({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 0',
    fontSize: 'var(--jp-ui-font-size0)',
    color: 'var(--jp-ui-font-color1)',
    cursor: 'pointer'
  });

  export const ChannelLabel = style({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  });

  export const FilterPopoverFooter = style({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
    gap: '8px'
  });

  export const FilterPopoverClear = style({
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 'var(--jp-ui-font-size0)',
    color: 'var(--jp-ui-font-color2)',
    cursor: 'pointer',
    textDecoration: 'underline'
  });

  export const FilterPopoverDone = style({
    border: '1px solid var(--jp-border-color1)',
    borderRadius: '3px',
    padding: '2px 8px',
    fontSize: 'var(--jp-ui-font-size0)',
    color: 'var(--jp-ui-font-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    cursor: 'pointer',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color3)'
      }
    }
  });

  export const FilterSectionLabel = style({
    marginTop: '4px',
    marginBottom: '2px',
    fontSize: 'var(--jp-ui-font-size0)',
    fontWeight: 600,
    color: 'var(--jp-ui-font-color1)'
  });

  export const StatusList = style({
    display: 'flex',
    gap: '4px',
    marginBottom: '6px'
  });

  export const StatusPill = style({
    borderRadius: '999px',
    border: '1px solid var(--jp-border-color1)',
    padding: '2px 8px',
    fontSize: 'var(--jp-ui-font-size0)',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    cursor: 'pointer',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color2)'
      }
    }
  });

  export const StatusPillActive = style({
    backgroundColor: 'var(--jp-brand-color1)',
    borderColor: 'var(--jp-brand-color1)',
    color: 'var(--jp-ui-inverse-font-color1)'
  });
}

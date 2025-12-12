import { HTMLSelect, InputGroup } from '@jupyterlab/ui-components';
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
}

export const CondaPkgToolBar = (props: ICondaPkgToolBarProps): JSX.Element => {
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
          <ToolbarButtonComponent
            label="Update"
            tooltip="Update selected packages"
            onClick={props.onApply}
            enabled={true}
            className={Style.UpdateButton}
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
            className={Style.UpdateButton}
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
        className={Style.UpdateButton}
      />
      <ToolbarButtonComponent
        icon={addIcon}
        label="Packages"
        tooltip="Add packages"
        onClick={props.onAddPackages}
        dataset={{ 'data-action': 'add-packages' }}
        className={Style.AddPackagesButton}
      />
      <div
        className={classes('lm-Widget jp-Toolbar-item', Style.FilterWrapper)}
      >
        <FontAwesomeIcon icon="filter" className={Style.FilterIcon} />
        <HTMLSelect
          value={props.category}
          onChange={props.onCategoryChanged}
          aria-label="Package filter"
          className={classes(Style.HiddenSelect, Style.FilterSelectOverlay)}
        >
          <option value={PkgFilters.Installed}>Installed</option>
          <option value={PkgFilters.Updatable}>Updatable</option>
          <option value={PkgFilters.Selected}>Selected</option>
        </HTMLSelect>
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
  export const Toolbar = style({
    alignItems: 'center',
    height: PACKAGE_TOOLBAR_HEIGHT
  });

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

  export const HiddenSelect = style({
    opacity: '0 !important',
    $nest: {
      '&, & *': {
        opacity: '0 !important'
      },
      '& .bp3-icon, & .jp-icon': {
        display: 'none !important'
      }
    }
  });

  export const SearchInput = style({
    lineHeight: 'normal'
  });

  export const Search = style({
    padding: '4px'
  });

  export const AddPackagesButton = style({
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

  export const UpdateButton = style({
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
      '&:hover': {
        backgroundColor: 'var(--jp-brand-color2)'
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
    justifyContent: 'center'
  });

  export const FilterIcon = style({
    color: 'var(--jp-ui-font-color2)',
    pointerEvents: 'none'
  });

  export const FilterSelectOverlay = style({
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer'
  });
}

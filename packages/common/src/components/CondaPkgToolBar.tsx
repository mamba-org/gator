import { HTMLSelect, InputGroup } from '@jupyterlab/ui-components';
import { ToolbarButtonComponent, addIcon } from '@jupyterlab/ui-components';
import * as React from 'react';
import { classes, style } from 'typestyle/lib';
import { CONDA_PACKAGES_TOOLBAR_CLASS } from '../constants';
import { cartArrowDownIcon, externalLinkIcon, undoIcon } from '../icon';

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
}

export const CondaPkgToolBar = (props: ICondaPkgToolBarProps): JSX.Element => {
  return (
    <div className={`lm-Widget ${CONDA_PACKAGES_TOOLBAR_CLASS} jp-Toolbar`}>
      <div className="lm-Widget jp-Toolbar-item">
        <HTMLSelect
          value={props.category}
          onChange={props.onCategoryChanged}
          aria-label="Package filter"
        >
          <option value={PkgFilters.Installed}>Installed</option>
          <option value={PkgFilters.Available}>Not installed</option>
          <option value={PkgFilters.Updatable}>Updatable</option>
          <option value={PkgFilters.Selected}>Selected</option>
        </HTMLSelect>
      </div>
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
      <div className="lm-Widget jp-Toolbar-spacer jp-Toolbar-item" />
      <ToolbarButtonComponent
        icon={externalLinkIcon}
        tooltip="Update all packages"
        onClick={props.onUpdateAll}
        enabled={props.hasUpdate}
        dataset={{ 'data-action': 'update-all' }}
      />
      <ToolbarButtonComponent
        icon={cartArrowDownIcon}
        tooltip="Apply package modifications"
        onClick={props.onApply}
        enabled={props.hasSelection}
        dataset={{ 'data-action': 'apply-modifications' }}
      />
      <ToolbarButtonComponent
        icon={undoIcon}
        tooltip="Clear package modifications"
        onClick={props.onCancel}
        enabled={props.hasSelection}
      />
      <ToolbarButtonComponent
        icon={addIcon}
        label="Packages"
        tooltip="Add packages"
        onClick={props.onAddPackages}
        dataset={{ 'data-action': 'add-packages' }}
        className={Style.AddPackagesButton}
      />
    </div>
  );
};

namespace Style {
  export const Toolbar = style({
    alignItems: 'center',
    height: PACKAGE_TOOLBAR_HEIGHT
  });

  export const SearchInput = style({
    lineHeight: 'normal'
  });

  export const Search = style({
    padding: '4px'
  });

  export const AddPackagesButton = style({
    gap: '6px',
    background: 'var(--jp-layout-color1)',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '6px',
    padding: '2px 6px',
    cursor: 'pointer',
    transition:
      'background-color .15s ease, border-color .15s ease, box-shadow .15s ease',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color2)',
        borderColor: 'var(--jp-border-color1)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
      },
      '&:active': {
        backgroundColor: 'var(--jp-layout-color3)'
      }
    }
  });
}

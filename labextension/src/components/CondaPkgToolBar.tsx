import { ToolbarButtonComponent } from "@jupyterlab/apputils";
import { HTMLSelect, InputGroup } from "@jupyterlab/ui-components";
import * as React from "react";
import { classes, style } from "typestyle/lib";

export const PACKAGETOOLBARHEIGHT = 40;

export enum PkgFilters {
  All = "ALL",
  Installed = "INSTALLED",
  Available = "AVAILABLE",
  Updatable = "UPDATABLE",
  Selected = "SELECTED"
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
}

export const CondaPkgToolBar = (props: ICondaPkgToolBarProps): JSX.Element => {
  let refreshClasses = "fa fa-refresh";
  if (props.isPending) {
    refreshClasses = refreshClasses + " fa-spin";
  }

  return (
    <div className="p-Widget jp-NbConda-ToolbarPackages jp-Toolbar">
      <HTMLSelect
        value={props.category}
        onChange={props.onCategoryChanged}
        iconProps={{
          icon: <span className="jp-MaterialIcon jp-DownCaretIcon bp3-icon" />
        }}
        aria-label="Package filter"
        minimal
      >
        <option value={PkgFilters.All}>All</option>
        <option value={PkgFilters.Installed}>Installed</option>
        <option value={PkgFilters.Available}>Not installed</option>
        <option value={PkgFilters.Updatable}>Updatable</option>
        <option value={PkgFilters.Selected}>Selected</option>
      </HTMLSelect>
      <div className="p-Widget jp-Toolbar-item">
        <div className={classes("jp-NbConda-search-wrapper", Style.Search)}>
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
      <div className="p-Widget jp-Toolbar-spacer jp-Toolbar-item" />
      <ToolbarButtonComponent
        iconClassName={classes(
          "fa",
          "fa-external-link-square",
          props.hasUpdate && Style.UpdateButton
        )}
        onClick={props.onUpdateAll}
        tooltip="Update all packages"
        enabled={props.hasUpdate}
      />
      <ToolbarButtonComponent
        iconClassName={classes(
          "fa",
          "fa-cart-arrow-down",
          props.hasSelection && Style.ApplyButton
        )}
        enabled={props.hasSelection}
        onClick={props.onApply}
        tooltip="Apply package modifications"
      />
      <ToolbarButtonComponent
        iconClassName="fa fa-undo"
        enabled={props.hasSelection}
        onClick={props.onCancel}
        tooltip="Clear package modifications"
      />
      <ToolbarButtonComponent
        iconClassName={refreshClasses}
        onClick={props.onRefreshPackages}
        tooltip="Refresh available packages"
        enabled={!props.isPending}
      />
    </div>
  );
};

namespace Style {
  export const Toolbar = style({
    alignItems: "center",
    height: PACKAGETOOLBARHEIGHT
  });

  export const SearchInput = style({
    lineHeight: "normal"
  });

  export const Search = style({
    padding: "4px"
  });

  export const ApplyButton = style({
    color: "var(--jp-brand-color0)"
  });

  export const UpdateButton = style({
    color: "var(--jp-accent-color0)"
  });
}

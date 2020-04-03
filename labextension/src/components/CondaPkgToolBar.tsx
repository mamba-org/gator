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
  let refreshClasses = classes("fa", "fa-refresh", Style.StandardButton);
  if (props.isPending) {
    refreshClasses = refreshClasses + " fa-spin";
  }

  return (
    <div className="lm-Widget jp-NbConda-ToolbarPackages jp-Toolbar">
      <div className="lm-Widget jp-Toolbar-item">
        <HTMLSelect
          value={props.category}
          onChange={props.onCategoryChanged}
          aria-label="Package filter"
        >
          <option value={PkgFilters.All}>All</option>
          <option value={PkgFilters.Installed}>Installed</option>
          <option value={PkgFilters.Available}>Not installed</option>
          <option value={PkgFilters.Updatable}>Updatable</option>
          <option value={PkgFilters.Selected}>Selected</option>
        </HTMLSelect>
      </div>
      <div className="lm-Widget jp-Toolbar-item">
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
      <div className="lm-Widget jp-Toolbar-spacer jp-Toolbar-item" />
      <ToolbarButtonComponent
        iconClass={classes(
          "fa",
          "fa-external-link-square",
          props.hasUpdate ? Style.UpdateButton : Style.StandardButton
        )}
        onClick={props.onUpdateAll}
        tooltip="Update all packages"
        enabled={props.hasUpdate}
      />
      <ToolbarButtonComponent
        iconClass={classes(
          "fa",
          "fa-cart-arrow-down",
          props.hasSelection ? Style.ApplyButton : Style.StandardButton
        )}
        enabled={props.hasSelection}
        onClick={props.onApply}
        tooltip="Apply package modifications"
      />
      <ToolbarButtonComponent
        iconClass={classes("fa", "fa-undo", Style.StandardButton)}
        enabled={props.hasSelection}
        onClick={props.onCancel}
        tooltip="Clear package modifications"
      />
      <ToolbarButtonComponent
        iconClass={refreshClasses}
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

  export const StandardButton = style({
    color: "var(--jp-inverse-layout-color3)"
  });

  export const ApplyButton = style({
    color: "var(--jp-brand-color0)"
  });

  export const UpdateButton = style({
    color: "var(--jp-accent-color0)"
  });
}

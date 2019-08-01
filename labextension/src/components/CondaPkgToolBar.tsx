import * as React from "react";
import { InputGroup } from "@jupyterlab/ui-components";
import { GlobalStyle } from "./globalStyles";
import { classes, style } from "typestyle/lib";

export enum PkgFilters {
  All = "ALL",
  Installed = "INSTALLED",
  Available = "AVAILABLE",
  Updatable = "UPDATABLE",
  Selected = "SELECTED"
}

export interface CondaPkgToolBarProps {
  category: PkgFilters;
  hasSelection: boolean;
  searchTerm: string;
  onCategoryChanged: (event) => void;
  onSearch: (event) => void;
  onApply: () => void;
  onCancel: () => void;
}

export const CondaPkgToolBar = (props: CondaPkgToolBarProps) => {
  return (
    <div className="p-Widget jp-NbConda-ToolbarPackages jp-Toolbar">
      <div className="p-Widget jp-Toolbar-item">
        <div className="jp-select-wrapper">
          <select
            className="jp-mod-styled"
            value={props.category}
            onChange={props.onCategoryChanged}
          >
            <option value={PkgFilters.All}>All</option>
            <option value={PkgFilters.Installed}>Installed</option>
            <option value={PkgFilters.Available}>Not installed</option>
            <option value={PkgFilters.Updatable}>Updatable</option>
            <option value={PkgFilters.Selected}>Selected</option>
          </select>
        </div>
      </div>
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
      <div className="p-Widget jp-ToolbarButton jp-Toolbar-item">
        <button
          className={
            props.hasSelection
              ? "jp-ToolbarButtonComponent jp-mod-accept"
              : "jp-ToolbarButtonComponent jp-button-hide"
          }
          onClick={props.onApply}
        >
          <span>Apply</span>
        </button>
      </div>
      <div className="p-Widget jp-ToolbarButton jp-Toolbar-item">
        <button
          className={
            props.hasSelection
              ? "jp-ToolbarButtonComponent jp-mod-reject"
              : "jp-ToolbarButtonComponent jp-button-hide"
          }
          onClick={props.onCancel}
        >
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

namespace Style {
  export const Toolbar = style({
    alignItems: "center",
    height: 40
  });

  export const SearchInput = style({
    // background: "transparent",
    // fontSize: "var(--jp-ui-font-size1)",
    // color: "var(--jp-ui-font-color0)",
    // // lineHeight: "var(--jp-private-commandpalette-search-height)",
    // boxSizing: "border-box",
    // borderRadius: 0,
    // $nest: {
    //   "&:focus": {
    //     boxShadow: "inset 0 0 0 1px var(--jp-input-active-box-shadow-color), inset 0 0 0 3px var(--jp-input-active-box-shadow-color)"
    //   }
    // }
  });

  export const Search = style({
    padding: "4px"
  });

  export const Button = classes(
    style({
      margin: "0px 2px"
    }),
    GlobalStyle.Button
  );
}

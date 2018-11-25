import * as React from "react";
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
  onApply();
  onCancel();
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
        <div className={Style.Search}>
          <input
            className={Style.SearchInput}
            type="search"
            onChange={props.onSearch}
            placeholder="Search Packages"
            value={props.searchTerm}
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
    height: 29
  });

  export const SearchInput = style({
    background: "transparent",
    width: "100%",
    float: "left",
    border: "1px solid var(--jp-border-color0)",
    outline: "none",
    fontSize: "var(--jp-ui-font-size1)",
    color: "var(--jp-ui-font-color0)",
    lineHeight: "20px",

    $nest: {
      "&:focus": {
        border: "var(--jp-border-width) solid var(--jp-brand-color1)",
        boxShadow: "inset 0 0 4px var(--jp-brand-color2)"
      }
    }
  });

  export const Search = style({
    overflow: "overlay",
    height: "100%",
    backgroundColor: "var(--jp-input-active-background)",

    $nest: {
      "&::after": {
        content: '" "',
        color: "var(--jp-ui-inverse-font-color1)",
        backgroundColor: "var(--jp-brand-color1)",
        position: "absolute",
        right: "0px",
        height: "100%",
        width: "12px",
        padding: "0px 12px",
        backgroundImage: "var(--jp-icon-search-white)",
        backgroundSize: "20px",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center"
      }
    }
  });

  export const Button = classes(
    style({
      margin: "0px 2px"
    }),
    GlobalStyle.Button
  );
}

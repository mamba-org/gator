import { HTMLSelect } from "@jupyterlab/ui-components";
import * as React from "react";
import { classes, style } from "typestyle";
import { Conda } from "../services";
import { PkgListStyle } from "./CondaPkgList";
import { GlobalStyle } from "./globalStyles";

/**
 * Package item properties
 */
export interface PkgItemProps {
  /**
   * Package object
   */
  package: Conda.IPackage;
  /**
   * Are package description available?
   */
  hasDescription?: boolean;
  /**
   * Package item click handler
   */
  onClick: (pkg: Conda.IPackage) => void;
  /**
   * Package version selection handler
   */
  onChange: (pkg: Conda.IPackage, version: string) => void;
}

/**
 * Package item React component
 *
 * @param props Component properties
 */
export const CondaPkgItem = (props: PkgItemProps) => {
  const {
    name,
    channel,
    summary,
    home,
    version_installed,
    version_selected,
    updatable,
    version
  } = props.package;

  let statusIcon = <i className={Style.StatusAvailable} />;
  let isSelected = false;

  if (version_installed) {
    statusIcon = <i className={Style.StatusInstalled} />;

    if (version_selected === "none") {
      statusIcon = <i className={Style.StatusRemove} />;
      isSelected = true;
    } else if (version_selected !== version_installed) {
      statusIcon = <i className={Style.StatusUpdate} />;
      isSelected = true;
    }
  } else if (version_selected !== "none") {
    statusIcon = <i className={Style.StatusInstalled} />;
    isSelected = true;
  }

  let nameElement = <span>{name}</span>;
  if (home && home.length > 0) {
    // TODO possible enhancement - open in a JupyterLab Panel
    nameElement = (
      <a
        className={Style.Link}
        href={home}
        onClick={evt => evt.stopPropagation()}
        target="_blank"
      >
        {name} <i className="fa fa-external-link" />
      </a>
    );
  }

  return (
    <tr
      className={classes(
        PkgListStyle.Row,
        isSelected ? Style.SelectedItem : Style.Item
      )}
      onClick={() => props.onClick(props.package)}
    >
      <td className={PkgListStyle.CellStatus}>{statusIcon}</td>
      <td className={PkgListStyle.CellName}>{nameElement}</td>
      {props.hasDescription && (
        <td className={PkgListStyle.CellSummary}>{summary}</td>
      )}
      <td
        className={
          updatable
            ? classes(Style.Updatable, PkgListStyle.Cell)
            : PkgListStyle.Cell
        }
      >
        {version_installed || ""}
      </td>
      <td className={PkgListStyle.Cell}>
        <HTMLSelect
          className={Style.VersionSelection}
          value={version_selected}
          onClick={(evt: React.MouseEvent) => {
            evt.stopPropagation();
          }}
          onChange={(evt: React.ChangeEvent<HTMLSelectElement>) =>
            props.onChange(props.package, evt.target.value)
          }
          iconProps={{
            icon: <span className="jp-MaterialIcon jp-DownCaretIcon bp3-icon" />
          }}
          aria-label="Package versions"
          minimal
        >
          <option key="-3" value={"none"}>
            Remove
          </option>
          {!version_installed && (
            <option key="-2" value={""}>
              Install
            </option>
          )}
          {updatable && (
            <option key="-1" value={""}>
              Update
            </option>
          )}
          {version.map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </HTMLSelect>
      </td>
      <td className={PkgListStyle.Cell}>{channel}</td>
    </tr>
  );
};

namespace Style {
  export const Item = style(
    GlobalStyle.ListItem
    // {
    // $nest: {
    //   "&:hover": {
    //     backgroundColor: "var(--jp-layout-color3)",
    //     border: "1px solid var(--jp-border-color3)"
    //   }
    // }
    // }
  );

  export const Link = style({
    $nest: {
      "&:hover": {
        textDecoration: "underline"
      }
    }
  });

  export const SelectedItem = style(GlobalStyle.ListItem, {
    backgroundColor: "var(--jp-brand-color3) !important",
    border: "1px solid var(--jp-brand-color3)"
  });

  export const StatusAvailable = classes(
    "fa",
    "fa-square-o",
    "fa-fw",
    style(GlobalStyle.FaIcon, {
      verticalAlign: "middle"
    })
  );

  export const StatusInstalled = classes(
    "fa",
    "fa-check-square",
    "fa-fw",
    style(GlobalStyle.FaIcon, {
      verticalAlign: "middle",
      color: "var(--jp-brand-color1)"
    })
  );

  export const StatusUpdate = classes(
    "fa",
    "fa-external-link-square",
    "fa-fw",
    style(GlobalStyle.FaIcon, {
      verticalAlign: "middle",
      color: "var(--jp-accent-color1)"
    })
  );

  export const StatusRemove = classes(
    "fa",
    "fa-minus-square",
    "fa-fw",
    style(GlobalStyle.FaIcon, {
      verticalAlign: "middle",
      color: "var(--jp-error-color1)"
    })
  );

  export const Updatable = style({
    color: "var(--jp-brand-color0)",

    $nest: {
      "&::before": {
        content: `'↗️'`,
        paddingRight: 2
      }
    }
  });

  export const VersionSelection = style({
    width: "100%"
  });
}

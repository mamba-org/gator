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
   * Are package description available?
   */
  hasDescription?: boolean;
  /**
   * Package item index
   */
  index: number;
  /**
   * Is change requested?
   */
  isSelected?: boolean;
  /**
   * Package object
   */
  package: Conda.IPackage;
  /**
   * Current package status
   */
  status: Conda.PkgStatus;
  /**
   * Package item click handler
   */
  onClick: (index: number) => void;
  /**
   * Package version selection handler
   */
  onChange: (index: number, version: string) => void;
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
  if (props.status === Conda.PkgStatus.Installed) {
    statusIcon = <i className={Style.StatusInstalled} />;
  } else if (props.status === Conda.PkgStatus.Update) {
    statusIcon = <i className={Style.StatusUpdate} />;
  } else if (props.status === Conda.PkgStatus.Remove) {
    statusIcon = <i className={Style.StatusRemove} />;
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
        props.isSelected ? Style.SelectedItem : Style.Item
      )}
      onClick={() => props.onClick(props.index)}
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
      <td>
        <HTMLSelect
          className={Style.VersionSelection}
          value={version_selected || version_installed}
          onClick={(evt: React.MouseEvent) => {
            evt.stopPropagation();
          }}
          onChange={(evt: React.ChangeEvent<HTMLSelectElement>) =>
            props.onChange(props.index, evt.target.value)
          }
          iconProps={{
            icon: <span className="jp-MaterialIcon jp-DownCaretIcon bp3-icon" />
          }}
          aria-label="Package versions"
          minimal
        >
          <option key="-1" value={null}>
            Not installed
          </option>
          {version.map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </HTMLSelect>
      </td>
      <td className={PkgListStyle.CellChannel}>{channel}</td>
    </tr>
  );
};

namespace Style {
  export const Item = style(GlobalStyle.ListItem, {
    $nest: {
      "&:hover": {
        backgroundColor: "var(--jp-layout-color3)",
        border: "1px solid var(--jp-border-color3)"
      }
    }
  });

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

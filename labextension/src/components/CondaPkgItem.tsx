import * as React from "react";
import { PackagesModel } from "../models";
import { PkgListStyle } from "./CondaPkgList";
import { style, classes } from "typestyle";
import { GlobalStyle } from "./globalStyles";

export interface PkgItemProps extends PackagesModel.IPackage {
  onClick: (name: string) => void;
}

export const CondaPkgItem = (props: PkgItemProps) => {
  let status = <i className={Style.StatusAvailable} />;
  if (props.status === PackagesModel.PkgStatus.Installed) {
    status = <i className={Style.StatusInstalled} />;
  } else if (props.status === PackagesModel.PkgStatus.Update) {
    status = <i className={Style.StatusUpdate} />;
  } else if (props.status === PackagesModel.PkgStatus.Remove) {
    status = <i className={Style.StatusRemove} />;
  }

  let name = <span>{props.name}</span>;
  if (props.home.length > 0) {
    // TODO possible enhancement - open in a JupyterLab Panel
    name = (
      <a href={props.home} target="_blank">
        {props.name}
      </a>
    );
  }

  return (
    <div
      className={classes(PkgListStyle.Row, Style.Item)}
      onClick={() => props.onClick(props.name)}
    >
      <div className={PkgListStyle.CellStatus}>{status}</div>
      <div className={PkgListStyle.CellName}>{name}</div>
      <div className={PkgListStyle.CellSummary}>{props.summary}</div>
      <div
        className={
          props.updatable
            ? classes(Style.Updatable, PkgListStyle.Cell)
            : PkgListStyle.Cell
        }
      >
        {props.version_installed}
      </div>
      <div className={PkgListStyle.CellChannel}>{props.channel}</div>
    </div>
  );
};

namespace Style {
  export const Item = style(GlobalStyle.ListItem, {
    $nest: {
      "&:hover": {
        backgroundColor: "var(--jp-layout-color2)",
        border: "1px solid var(--jp-border-color2)"
      }
    }
  });

  export const SelectedItem = style(GlobalStyle.ListItem, {
    backgroundColor: "var(--jp-brand-color1)",
    color: "var(--jp-ui-inverse-font-color1)",
    border: "1px solid var(--jp-brand-color1)",
    display: "flex"
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
    color: "var(--jp-brand-color1)",

    $nest: {
      "&::before": {
        content: `'↗️'`,
        paddingRight: 2
      }
    }
  });
}

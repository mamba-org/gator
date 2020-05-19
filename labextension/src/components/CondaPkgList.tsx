import { HTMLSelect } from "@jupyterlab/ui-components";
import * as React from "react";
import { AutoSizer, Column, Table } from "react-virtualized";
import { classes, style } from "typestyle";
import { Conda } from "../tokens";
import { GlobalStyle } from "./globalStyles";

/**
 * Package list component properties
 */
export interface IPkgListProps {
  /**
   * Are package description available?
   */
  hasDescription: boolean;
  /**
   * Component height
   */
  height: number;
  /**
   * Conda package list
   */
  packages: Conda.IPackage[];
  /**
   * Package item click handler
   */
  onPkgClick: (pkg: Conda.IPackage) => void;
  /**
   * Package item version selection handler
   */
  onPkgChange: (pkg: Conda.IPackage, version: string) => void;
}

/**
 * react-virtualized interfaces
 */
interface ICellRender {
  cellData?: any;
  columnData?: any;
  dataKey: string;
  rowData: any;
  rowIndex: number;
}

interface IIndex {
  index: number;
}

/** React component for the package list */
export class CondaPkgList extends React.Component<IPkgListProps> {
  public static defaultProps: Partial<IPkgListProps> = {
    hasDescription: false,
    packages: []
  };

  constructor(props: IPkgListProps) {
    super(props);
  }

  render(): JSX.Element {
    const rowGetter = ({ index }: IIndex): Conda.IPackage =>
      this.props.packages[index];

    const iconRender = ({ rowData }: ICellRender): JSX.Element => {
      if (rowData.version_installed) {
        if (rowData.version_selected === "none") {
          return <i className={Style.StatusRemove} />;
        } else if (rowData.version_selected !== rowData.version_installed) {
          return <i className={Style.StatusUpdate} />;
        }
        return <i className={Style.StatusInstalled} />;
      } else if (rowData.version_selected !== "none") {
        return <i className={Style.StatusInstalled} />;
      }

      return <i className={Style.StatusAvailable} />;
    };

    const isSelected = (index: number): boolean => {
      const rowData = this.props.packages[index];

      if (rowData.version_installed) {
        if (rowData.version_selected === "none") {
          return true;
        } else if (rowData.version_selected !== rowData.version_installed) {
          return true;
        }
      } else if (rowData.version_selected !== "none") {
        return true;
      }
      return false;
    };

    const nameRender = ({ rowData }: ICellRender): JSX.Element => {
      if (rowData.home && rowData.home.length > 0) {
        // TODO possible enhancement - open in a JupyterLab Panel
        return (
          <a
            className={Style.Link}
            href={rowData.home}
            onClick={(evt): void => evt.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
          >
            {rowData.name} <i className="fa fa-external-link" />
          </a>
        );
      }
      return <span>{rowData.name}</span>;
    };

    const changeRender = ({ rowData }: ICellRender): JSX.Element => (
      <div className={"lm-Widget"}>
        <HTMLSelect
          className={Style.VersionSelection}
          value={rowData.version_selected}
          onClick={(evt: React.MouseEvent): void => {
            evt.stopPropagation();
          }}
          onChange={(evt: React.ChangeEvent<HTMLSelectElement>): void =>
            this.props.onPkgChange(rowData, evt.target.value)
          }
          aria-label="Package versions"
        >
          <option key="-3" value={"none"}>
            Remove
          </option>
          {!rowData.version_installed && (
            <option key="-2" value={""}>
              Install
            </option>
          )}
          {rowData.updatable && (
            <option key="-1" value={""}>
              Update
            </option>
          )}
          {rowData.version.map((v: string) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </HTMLSelect>
      </div>
    );

    return (
      <div className={Style.TableContainer}>
        <AutoSizer disableHeight>
          {({ width }): JSX.Element => (
            <Table
              className={Style.Table}
              headerClassName={Style.Header}
              headerHeight={29}
              height={this.props.height}
              onRowClick={({ rowData }): void => this.props.onPkgClick(rowData)}
              rowClassName={({ index }): string => {
                if (index >= 0) {
                  return index % 2 === 0
                    ? Style.RowEven(isSelected(index))
                    : Style.RowOdd(isSelected(index));
                }
              }}
              rowCount={this.props.packages.length}
              rowGetter={rowGetter}
              rowHeight={40}
              width={width}
            >
              <Column
                className={Style.CellStatus}
                dataKey="status"
                cellRenderer={iconRender}
                disableSort
                label=""
                flexShrink={0}
                width={20}
              />
              <Column
                className={Style.CellName}
                dataKey="name"
                cellRenderer={nameRender}
                disableSort
                label="Name"
                width={200}
                flexGrow={1}
                flexShrink={1}
              />
              {this.props.hasDescription && (
                <Column
                  className={Style.CellSummary}
                  dataKey="summary"
                  disableSort
                  label="Description"
                  width={250}
                  flexGrow={5}
                  flexShrink={5}
                />
              )}
              <Column
                cellRenderer={({ rowData }: ICellRender): JSX.Element => (
                  <span
                    className={
                      rowData.updatable
                        ? classes(Style.Updatable, Style.Cell)
                        : Style.Cell
                    }
                  >
                    {rowData.version_installed}
                  </span>
                )}
                dataKey="version_installed"
                disableSort
                label="Version"
                flexShrink={0}
                width={90}
              />
              <Column
                className={Style.Cell}
                dataKey="version_selected"
                cellRenderer={changeRender}
                disableSort
                label="Change to"
                flexShrink={0}
                width={120}
              />
              <Column
                className={Style.Cell}
                dataKey="channel"
                disableSort
                flexGrow={1}
                label="Channel"
                flexShrink={1}
                width={120}
              />
            </Table>
          )}
        </AutoSizer>
      </div>
    );
  }
}

namespace Style {
  export const TableContainer = style({});

  export const Table = style({});

  export const Header = style({
    color: "var(--jp-ui-font-color1)",
    fontWeight: "bold",
    fontSize: "var(--jp-ui-font-size2)",
    textAlign: "left"

    // $nest: {
    //   '&:hover div': {
    //     fontWeight: 600,
    //     color: 'var(--jp-ui-font-color0)'
    //   },
    //   '&:focus div': {
    //     outline: 'none'
    //   },
    //   '&:active div': {
    //     fontWeight: 600,
    //     color: 'var(--jp-ui-font-color0)'
    //   }
    // }
  });

  export const RowEven = (selected: boolean): string =>
    style({
      background: selected ? "var(--jp-brand-color3)" : "unset",
      $nest: {
        "&:hover": {
          backgroundColor: "var(--jp-layout-color3)"
        }
      }
    });

  export const RowOdd = (selected: boolean): string =>
    style({
      background: selected
        ? "var(--jp-brand-color3)"
        : "var(--jp-layout-color2)",
      $nest: {
        "&:hover": {
          backgroundColor: "var(--jp-layout-color3)"
        }
      }
    });

  export const CellStatus = style({
    padding: "0px 2px"
  });

  export const CellName = style({ whiteSpace: "nowrap" });

  export const CellSummary = style({
    alignSelf: "flex-start",
    whiteSpace: "normal"
  });

  export const Cell = style({
    whiteSpace: "nowrap"
  });

  export const SortButton = style({
    transform: "rotate(180deg)",
    marginLeft: "10px",
    color: "var(--jp-ui-font-color2)",
    border: "none",
    backgroundColor: "var(--jp-layout-color0)",
    fontSize: "var(--jp-ui-font-size1)"
  });

  export const Link = style({
    $nest: {
      "&:hover": {
        textDecoration: "underline"
      }
    }
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
        content: "'↗️'",
        paddingRight: 2
      }
    }
  });

  export const VersionSelection = style({
    width: "100%"
  });
}

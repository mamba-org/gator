import * as React from "react";
import { style } from "typestyle";
import { Conda } from "../services";
import { CondaPkgItem } from "./CondaPkgItem";

/**
 * Package list title component properties
 */
export interface ITitleItemProps {
  /**
   * Title
   */
  title: string;
  /**
   * Associated sorted field
   */
  field: TitleItem.SortField;
  /**
   * Sorted status
   */
  status: TitleItem.SortStatus;
  /**
   * Update sorting column
   */
  updateSort: (name: TitleItem.SortField, status: TitleItem.SortStatus) => void;
}

/**
 * Package list title component
 */
export class TitleItem extends React.Component<ITitleItemProps> {
  render() {
    return (
      <span
        className={
          PkgListStyle.HeaderItem
          // TODO Styling once sorting is available
          // this.props.status === TitleItem.SortStatus.None
          //   ? PkgListStyle.HeaderItem
          //   : classes(PkgListStyle.HeaderItem, PkgListStyle.CurrentHeaderItem)
        }
        onClick={() =>
          this.props.updateSort(this.props.field, this.props.status)
        }
      >
        {this.props.title}
      </span>
    );
  }
}

export namespace TitleItem {
  export enum SortStatus {
    Down = -1,
    None,
    Up
  }

  export enum SortField {
    Name = "NAME",
    Channel = "CHANNEL",
    Status = "STATUS",
    Version = "VERSION"
  }
}

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
   * Selected conda package
   */
  selection: Array<{ index: number; status: Conda.PkgStatus }>;
  /**
   * Field used for sorting
   */
  sortedBy: TitleItem.SortField;
  /**
   * Sort direction
   */
  sortDirection: TitleItem.SortStatus;
  /**
   * Field sorting handler
   */
  onSort: (field: TitleItem.SortField, status: TitleItem.SortStatus) => void;
  /**
   * Package item click handler
   */
  onPkgClick: (index: number) => void;
  /**
   * Package item version selection handler
   */
  onPkgChange: (index: number, version: string) => void;
}

/** React component for the package list */
export class CondaPkgList extends React.Component<IPkgListProps> {
  public static defaultProps: Partial<IPkgListProps> = {
    hasDescription: false,
    packages: [],
    selection: []
  };

  constructor(props: IPkgListProps) {
    super(props);
  }

  render() {
    const listItems = this.props.packages.map((pkg, index) => {
      const selection = this.props.selection.filter(
        selected => selected.index === index
      );
      const isSelected = selection[0] !== undefined;
      const status = isSelected ? selection[0].status : pkg.status;

      return (
        <CondaPkgItem
          hasDescription={this.props.hasDescription}
          index={index}
          key={index}
          package={pkg}
          isSelected={isSelected}
          status={status}
          onClick={this.props.onPkgClick}
          onChange={this.props.onPkgChange}
        />
      );
    });

    return (
      <div className={PkgListStyle.TableContainer(this.props.height)}>
        <table className={PkgListStyle.Table}>
          <thead>
            <tr className={PkgListStyle.Header}>
              <th className={PkgListStyle.CellStatus}>
                <TitleItem
                  title=""
                  field={TitleItem.SortField.Status}
                  updateSort={() => {}}
                  status={
                    this.props.sortedBy === TitleItem.SortField.Status
                      ? this.props.sortDirection
                      : TitleItem.SortStatus.None
                  }
                />
              </th>
              <th className={PkgListStyle.CellName}>
                <TitleItem
                  title="Name"
                  field={TitleItem.SortField.Name}
                  updateSort={this.props.onSort}
                  status={
                    this.props.sortedBy === TitleItem.SortField.Name
                      ? this.props.sortDirection
                      : TitleItem.SortStatus.None
                  }
                />
              </th>
              {this.props.hasDescription && (
                <th className={PkgListStyle.CellSummary}>
                  <div className={PkgListStyle.HeaderItem}>Description</div>
                </th>
              )}
              <th className={PkgListStyle.Cell}>
                <TitleItem
                  title="Version"
                  field={TitleItem.SortField.Version}
                  updateSort={this.props.onSort}
                  status={
                    this.props.sortedBy === TitleItem.SortField.Version
                      ? this.props.sortDirection
                      : TitleItem.SortStatus.None
                  }
                />
              </th>
              <th className={PkgListStyle.Cell}>
                <span className={PkgListStyle.HeaderItem}>Available</span>
              </th>
              <th className={PkgListStyle.CellChannel}>
                <TitleItem
                  title="Channel"
                  field={TitleItem.SortField.Channel}
                  updateSort={this.props.onSort}
                  status={
                    this.props.sortedBy === TitleItem.SortField.Channel
                      ? this.props.sortDirection
                      : TitleItem.SortStatus.None
                  }
                />
              </th>
            </tr>
          </thead>
          <tbody>{listItems}</tbody>
        </table>
      </div>
    );
  }
}

export namespace PkgListStyle {
  export const TableContainer = (height: number) => {
    return style({
      height: height,
      width: "100%",
      overflowX: "auto",
      overflowY: "auto",

      $nest: {
        table: {
          borderCollapse: "collapse"
        }
      }
    });
  };

  export const Table = style({
    width: "100%"
  });

  export const Header = style({
    color: "var(--jp-ui-font-color1)",
    width: "100%",
    fontWeight: "bold",
    fontSize: "var(--jp-ui-font-size2)",
    height: 29,
    textAlign: "left"
  });

  export const Row = style({
    width: "100%",
    $nest: {
      "&:nth-child(even)": {
        background: "var(--jp-layout-color2)"
      }
    }
  });

  export const CellStatus = style({
    padding: "0px 2px"
  });

  export const CellName = style({});

  export const CellSummary = style({
    whiteSpace: "normal",
    maxWidth: "60%"
  });

  export const CellChannel = style({});

  export const Cell = style({});

  export const HeaderItem = style({
    padding: "0px 5px"

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

  export const CurrentHeaderItem = style({
    $nest: {
      "&::after": {
        content: `'\\F0DD'`, // up \\F0DE
        fontFamily: "FontAwesome",
        display: "inline-block",
        textAlign: "right",
        flex: "1 1 auto",
        padding: "0 5px"
      }
    }
  });

  export const SortButton = style({
    transform: "rotate(180deg)",
    marginLeft: "10px",
    color: "var(--jp-ui-font-color2)",
    border: "none",
    backgroundColor: "var(--jp-layout-color0)",
    fontSize: "var(--jp-ui-font-size1)"
  });
}

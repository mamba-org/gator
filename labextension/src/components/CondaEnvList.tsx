import * as React from "react";
import { style } from "typestyle";

import { Conda } from "../services";

import { CondaEnvItem } from "./CondaEnvItem";
import { CondaEnvToolBar, ENVIRONMENTTOOLBARHEIGHT } from "./CondaEnvToolBar";

export const ENVIRONMENTPANELWIDTH = 250;

/**
 * Environment list properties
 */
export interface IEnvListProps {
  /**
   * Component height
   */
  height: number;
  /**
   * Is the environment list loading?
   */
  isPending: boolean;
  /**
   * Environment list
   */
  environments: Array<Conda.IEnvironment>;
  /**
   * Currently selected environment
   */
  selected: string;
  /**
   * Environment selection handler
   */
  onSelectedChange(name: string): void;
  /**
   * Environment creation handler
   */
  onCreate(): void;
  /**
   * Environment clone handler
   */
  onClone(): void;
  /**
   * Environment import handler
   */
  onImport(): void;
  /**
   * Environment export handler
   */
  onExport(): void;
  /**
   * Refresh environment handler
   */
  onRefresh(): void;
  /**
   * Environment remove handler
   */
  onRemove(): void;
}

/**
 * React component for the environment list
 */
export class CondaEnvList extends React.Component<IEnvListProps> {
  render() {
    let isDefault = false;
    const listItems = this.props.environments.map((env, idx) => {
      let selected = env.name === this.props.selected;
      if (selected) {
        // Forbid clone and removing the environment named "base" (base conda environment)
        // and the default one (i.e. the one containing JupyterLab)
        isDefault = env.is_default || env.name === "base";
      }
      return (
        <CondaEnvItem
          name={env.name}
          key={env.name}
          selected={
            this.props.selected ? env.name === this.props.selected : false
          }
          onClick={this.props.onSelectedChange}
        />
      );
    });

    return (
      <div className={Style.Panel}>
        <CondaEnvToolBar
          isBase={isDefault}
          isPending={this.props.isPending}
          onCreate={this.props.onCreate}
          onClone={this.props.onClone}
          onImport={this.props.onImport}
          onExport={this.props.onExport}
          onRefresh={this.props.onRefresh}
          onRemove={this.props.onRemove}
        />
        <div
          className={Style.ListEnvs(
            this.props.height - ENVIRONMENTTOOLBARHEIGHT - 32
          )}
        >
          {listItems}
        </div>
      </div>
    );
  }
}

namespace Style {
  export const Panel = style({
    flexGrow: 0,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    width: ENVIRONMENTPANELWIDTH
  });

  export const ListEnvs = (height: number) =>
    style({
      height: height,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column"
    });
}

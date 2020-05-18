import * as React from "react";
import { style } from "typestyle";
import { Conda } from "../tokens";
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
export const CondaEnvList: React.FunctionComponent<IEnvListProps> = (
  props: IEnvListProps
) => {
  let isDefault = false;
  const listItems = props.environments.map((env, idx) => {
    const selected = env.name === props.selected;
    if (selected) {
      // Forbid clone and removing the environment named "base" (base conda environment)
      // and the default one (i.e. the one containing JupyterLab)
      isDefault = env.is_default || env.name === "base";
    }
    return (
      <CondaEnvItem
        name={env.name}
        key={env.name}
        selected={props.selected ? env.name === props.selected : false}
        onClick={props.onSelectedChange}
      />
    );
  });

  return (
    <div className={Style.Panel}>
      <CondaEnvToolBar
        isBase={isDefault}
        isPending={props.isPending}
        onCreate={props.onCreate}
        onClone={props.onClone}
        onImport={props.onImport}
        onExport={props.onExport}
        onRefresh={props.onRefresh}
        onRemove={props.onRemove}
      />
      <div
        className={Style.ListEnvs(props.height - ENVIRONMENTTOOLBARHEIGHT - 32)}
      >
        {listItems}
      </div>
    </div>
  );
};

namespace Style {
  export const Panel = style({
    flexGrow: 0,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    width: ENVIRONMENTPANELWIDTH
  });

  export const ListEnvs = (height: number): string =>
    style({
      height: height,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column"
    });
}

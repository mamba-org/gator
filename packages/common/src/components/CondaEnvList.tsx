import * as React from 'react';
import { style } from 'typestyle';
import { CONDA_ENVIRONMENT_PANEL_ID } from '../constants';
import { Conda } from '../tokens';
import { CondaEnvItem } from './CondaEnvItem';
import { CommandRegistry } from '@lumino/commands';

export const ENVIRONMENT_PANEL_WIDTH = 250;

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
   * Environment creation dialog open handler
   */
  onOpen(): void;
  commands: CommandRegistry;
}

/**
 * React component for the environment list
 */
export const CondaEnvList: React.FunctionComponent<IEnvListProps> = (
  props: IEnvListProps
) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Scroll selected environment into view
  React.useEffect(() => {
    if (props.selected && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-environment-name="${props.selected}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [props.selected]);

  let isDefault = false;
  const listItems = props.environments.map((env, idx) => {
    // Forbid clone and removing the environment named "base" (base conda environment)
    // and the default one (i.e. the one containing JupyterLab)
    isDefault = env.is_default || env.name === 'base';

    return (
      <CondaEnvItem
        isDefault={isDefault}
        name={env.name}
        key={env.name}
        selected={props.selected ? env.name === props.selected : false}
        onClick={props.onSelectedChange}
        commands={props.commands}
      />
    );
  });

  return (
    <div className={Style.Panel}>
      <div
        ref={listRef}
        id={CONDA_ENVIRONMENT_PANEL_ID}
        className={Style.ListEnvs(props.height)}
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
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: ENVIRONMENT_PANEL_WIDTH,
    minHeight: 0
  });

  export const ListEnvs = (height: number): string =>
    style({
      height: height,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    });
}

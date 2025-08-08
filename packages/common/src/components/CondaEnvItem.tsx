import * as React from 'react';
import { useEffect } from 'react';
import { classes, style } from 'typestyle';
import { Menu } from '@lumino/widgets';
import { CommandRegistry } from '@lumino/commands';
import { ToolbarButtonComponent } from '@jupyterlab/ui-components';
import { GlobalStyle } from './globalStyles';
import { ellipsisVerticalIcon, cloneIcon } from '../icon';
import { downloadIcon, deleteIcon } from '@jupyterlab/ui-components';

/**
 * Environment item properties
 */
export interface IEnvItemProps {
  /**
   * Environment name
   */
  name: string;
  /**
   * Is the environment selected?
   */
  selected?: boolean;
  /**
   * Environment item click handler
   */
  onClick(name: string): void;
  onClone(name: string): void;
  onRemove(name: string): void;
  onExport(name: string): void;
  onRefresh(): void;
  commands: CommandRegistry;
}

export const createMenu = (
  commands: CommandRegistry,
  envName: string
): Menu => {
  const menu = new Menu({ commands });
  menu.addItem({
    command: 'gator-lab:remove-env',
    args: { name: envName }
  });
  menu.addItem({
    command: 'gator-lab:clone-env',
    args: { name: envName }
  });
  menu.addItem({
    command: 'gator-lab:export-env',
    args: { name: envName }
  });
  return menu;
};

/**
 * Environment item component
 */
export const CondaEnvItem: React.FunctionComponent<IEnvItemProps> = (
  props: IEnvItemProps
) => {
  useEffect(() => {
    console.log('commands instance:', props.commands);
    console.log('hasCommand is function?', typeof props.commands.hasCommand);

    if (!props.commands.hasCommand('gator-lab:clone-env')) {
      props.commands.addCommand('gator-lab:clone-env', {
        icon: cloneIcon,
        label: 'Clone',
        execute: async args => {
          const name = args['name'] as string;
          console.log('cloning environment:', name);
          props.onClone(name);
          props.onRefresh();
        }
      });
    }

    if (!props.commands.hasCommand('gator-lab:remove-env')) {
      props.commands.addCommand('gator-lab:remove-env', {
        icon: deleteIcon,
        label: 'Remove',
        execute: async args => {
          const name = args['name'] as string;
          console.log('removing environment:', name);
          props.onRemove(name);
          props.onRefresh();
        }
      });
    }

    if (!props.commands.hasCommand('gator-lab:export-env')) {
      props.commands.addCommand('gator-lab:export-env', {
        icon: downloadIcon,
        label: 'Export',
        execute: async args => {
          const name = args['name'] as string;
          console.log('exporting environment:', name);
          props.onExport(name);
        }
      });
    }
  }, [props.commands]);

  const iconRef = React.useRef<HTMLDivElement>(null);

  const handleItemClick = () => {
    props.onClick(props.name);
  };

  const handleMenuClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = iconRef.current?.getBoundingClientRect();
    const x = rect?.left ?? event.clientX;
    const y = (rect?.bottom ?? event.clientY) + 4;

    const menu = createMenu(props.commands, props.name);
    menu.open(x, y);
  };

  return (
    <div
      className={props.selected ? Style.SelectedItem : Style.Item}
      onClick={handleItemClick}
    >
      <span>{props.name}</span>
      <div
        className={classes('jp-CondaEnvKebab')}
        ref={iconRef}
        onClick={handleMenuClick}
        title="More actions"
      >
        <ToolbarButtonComponent icon={ellipsisVerticalIcon} />
      </div>
    </div>
  );
};

namespace Style {
  export const Item = style(GlobalStyle.ListItem, {
    padding: '2px 0 5px 5px',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color2)',
        border: '1px solid var(--jp-border-color2)'
      }
    }
  });

  export const SelectedItem = style(GlobalStyle.ListItem, {
    padding: '2px 0 5px 5px',
    backgroundColor: 'var(--jp-brand-color1)',
    color: 'var(--jp-ui-inverse-font-color1)',
    border: '1px solid var(--jp-brand-color1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',

    $nest: {
      '&::after': {
        display: 'inline-block',
        padding: '0 5px',
        width: 0,
        height: 0,
        borderTop: 'calc(var(--jp-ui-font-size1) / 2) solid transparent',
        borderBottom: 'calc(var(--jp-ui-font-size1) / 2) solid transparent',
        borderLeft:
          'calc(var(--jp-ui-font-size1) / 2) solid var(--jp-ui-inverse-font-color1)'
      }
    }
  });

  export const Kebab = style({
    cursor: 'pointer',
    marginLeft: 'auto',
    padding: '0 5px',
    justifyContent: 'flex-end'
  });
}

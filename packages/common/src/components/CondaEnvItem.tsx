import * as React from 'react';
import { style } from 'typestyle';
import { GlobalStyle } from './globalStyles';

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
}

/**
 * Environment item component
 */
export const CondaEnvItem: React.FunctionComponent<IEnvItemProps> = (
  props: IEnvItemProps
) => {
  return (
    <div
      className={props.selected ? Style.SelectedItem : Style.Item}
      onClick={(): void => props.onClick(props.name)}
    >
      {props.name}
    </div>
  );
};

namespace Style {
  export const Item = style(GlobalStyle.ListItem, {
    padding: '2px 0 5px 5px',

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
        content: "' '",
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
}

import * as React from 'react';
import { style } from 'typestyle';
import { NestedCSSProperties } from 'typestyle/lib/types';

export interface EnvItemProps {
  name: string,
  selected?: boolean
}

export class CondaEnvItem extends React.Component<EnvItemProps>{
  render() {
    return (
      <div className={this.props.selected ? Style.SelectedItem : Style.Item}>
        {this.props.name}
      </div>
    );
  }
}

namespace Style{
  const CommonItem = {
    flex: '0 0 auto',
    border: '1px solid transparent',
    overflow: 'hidden',
    padding: '2px 0 5px 5px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--jp-ui-font-color1)',
    fontSize: 'var(--jp-ui-font-size1)',
    listStyleType: 'none'
  }

  export const Item = style(
    CommonItem as NestedCSSProperties,
    {
      $nest: {
        '&:hover': {
          backgroundColor: 'var(--jp-layout-color2)',
          border: '1px solid var(--jp-border-color2)'
        }
      }
    });

  export const SelectedItem = style(
    CommonItem as NestedCSSProperties,
    {
      backgroundColor: 'var(--jp-brand-color1)',
      color: 'var(--jp-ui-inverse-font-color1)',
      border: '1px solid var(--jp-brand-color1)',
      display: 'flex',

      $nest: {
        '&::after': {
          content: `'▶️'`,
          display: 'inline-block',
          textAlign: 'right',
          flex: '1 1 auto',
          padding: '0 5px'
        }
      }
    });
}
import * as React from 'react';
import { style } from 'typestyle';

export interface EnvItemProps {
  name: string,
  selected?: boolean
}

export class CondaEnvItem extends React.Component<EnvItemProps>{
  render() {
    return (
      <div className={Style.Item}>
        {this.props.name}
      </div>
    );
  }
}

namespace Style{
  export const Item = style({
    flexGrow: 0,
    flexShrink: 0
  })
}
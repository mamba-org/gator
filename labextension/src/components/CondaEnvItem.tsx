import * as React from 'react';

export interface EnvItemProps {
  name: string,
  selected?: boolean
}

export class CondaEnvItem extends React.Component<EnvItemProps>{
  render() {
    return (
      <div style={{  padding: '10px', width: '100%', display: 'table-row'}}>
        <div style={{ display: 'table-cell', width: '100%'}}>
          {this.props.name}
        </div>
      </div>
    );
  }
}
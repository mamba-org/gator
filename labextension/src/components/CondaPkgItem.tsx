import * as React from 'react';

export interface IPackage {
  name: string,
  version: string,
  build: string
}

export interface PkgItemProps {
  name: string,
  selected: boolean,
  version: string,
  build: string,
  onChange: () => void
}

export class CondaPkgItem extends React.Component<PkgItemProps>{
  render() {
    let checkbox;
    if (this.props.selected) {
      checkbox = <input type="checkbox" value={this.props.name.toLowerCase()} onChange={this.props.onChange} checked />;
    } else {
      checkbox = <input type="checkbox" value={this.props.name.toLowerCase()} onChange={this.props.onChange} />;
    }

    return (
      <div style={{padding: '10px', width: '100%', display: 'table-row'}} >
        <div style={{ display: 'table-cell', width: '40%'}}>
          {checkbox}
          <label>{this.props.name}</label>
        </div>
        <div style={{ display: 'table-cell', width: '20%'}}>{this.props.version}</div>
        <div style={{ display: 'table-cell', width: '20%'}}>{this.props.build}</div>
      </div>);
  }
}
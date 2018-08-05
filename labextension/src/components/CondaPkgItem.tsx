import * as React from 'react';
import { PackagesModel } from '../models';

export interface PkgItemProps extends PackagesModel.IPackage {
  onChange: () => void
}

export const CondaPkgItem = (props: PkgItemProps) => {
    let checkbox;
    if (props.installed) {
      checkbox = <input type="checkbox" value={props.name} onChange={props.onChange} checked />;
    } else {
      checkbox = <input type="checkbox" value={props.name} onChange={props.onChange} />;
    }

    return (
      <div style={{padding: '10px', width: '100%', display: 'table-row'}} >
        <div style={{ display: 'table-cell', width: '40%'}}>
          {checkbox}
          <label>{props.name}</label>
        </div>
        <div style={{ display: 'table-cell', width: '20%'}}>{props.version}</div>
        <div style={{ display: 'table-cell', width: '20%'}}>{props.build}</div>
      </div>);
}
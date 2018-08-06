import * as React from 'react';
import { PackagesModel } from '../models';
import { PkgListStyle } from './CondaPkgList';

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
      <div className={PkgListStyle.Row} >
        <div className={PkgListStyle.CellName}>
          {checkbox}
          <label>{props.name}</label>
        </div>
        <div className={PkgListStyle.Cell}>{props.version}</div>
        <div className={PkgListStyle.Cell}>{props.build}</div>
      </div>);
}
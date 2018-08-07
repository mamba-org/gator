import * as React from 'react';
import { PackagesModel } from '../models';
import { PkgListStyle } from './CondaPkgList';
import { style, classes } from 'typestyle';
import { GlobalStyle } from './globalStyles';

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
      <div className={classes(PkgListStyle.Row, Style.Item)} >
        <div className={PkgListStyle.CellName}>
          {checkbox}
          <label>{props.name}</label>
        </div>
        <div className={PkgListStyle.Cell}>{props.version}</div>
        {/* <div className={PkgListStyle.Cell}>{props.build}</div> */}
      </div>);
}

namespace Style{

  export const Item = style(
    GlobalStyle.ListItem,
    {
      $nest: {
        '&:hover': {
          backgroundColor: 'var(--jp-layout-color2)',
          border: '1px solid var(--jp-border-color2)'
        }
      }
    });

  export const SelectedItem = style(
    GlobalStyle.ListItem,
    {
      backgroundColor: 'var(--jp-brand-color1)',
      color: 'var(--jp-ui-inverse-font-color1)',
      border: '1px solid var(--jp-brand-color1)',
      display: 'flex'
    });
}
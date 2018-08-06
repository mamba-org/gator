import * as React from 'react';
import { CondaPkgItem } from './CondaPkgItem';
import { PackagesModel } from '../models';
import { style, classes } from 'typestyle';

export interface ITitleItemProps {
  title: string,
  updateSort: (name: string) => void,
  active: boolean
}

export const TitleItem = (props: ITitleItemProps) => {
  return (
    <div
      className={
        props.active
          ? classes(PkgListStyle.HeaderItem, PkgListStyle.CurrentHeaderItem)
          : PkgListStyle.HeaderItem
      }
      onClick={() => props.updateSort(props.title.toLowerCase())}
    >
      {props.title}
      <div className={PkgListStyle.SortButton}>⌃</div>
    </div>
  );
}

export interface IPkgListProps extends PackagesModel.IPackages {
}

/** Top level React component for widget */
export class CondaPkgList extends React.Component<IPkgListProps>{

  constructor(props){
    super(props);

    this.handleChangePackage = this.handleChangePackage.bind(this);
    this.handleSort = this.handleSort.bind(this);
  }

  handleChangePackage(){}

  handleSort(name: string){}

  render(){
    const listItems = this.props.packages.map((pkg, idx) => {
      return (
        <CondaPkgItem 
          name={pkg.name} 
          key={"pkg-" + idx} 
          installed={pkg.installed}
          updatable={pkg.updatable}
          version={pkg.version} 
          build={pkg.build} 
          onChange={this.handleChangePackage} />);
    });

    return (
        <div className={PkgListStyle.List}>
          <div className={PkgListStyle.Header}>
            <div className={PkgListStyle.CellName}>
              <TitleItem
                title='Name'
                updateSort={this.handleSort}
                active={false} />
            </div>
            <div className={PkgListStyle.Cell}>
              <TitleItem 
                title='Version'
                updateSort={this.handleSort}
                active={false} />
            </div>
            <div className={PkgListStyle.CellName}>
              <TitleItem 
                title='Build'
                updateSort={this.handleSort}
                active={false} />
            </div>
          </div>
          {listItems}
        </div>
    );
  }
}

export namespace PkgListStyle{
  export const List = style({
    display: 'table'
  });

  export const Header = style({
    display: 'table-row',
    width: '100%',
    fontWeight: 'bold',
    fontSize: 'var(--jp-ui-font-size2)'
  });

  export const Row = style({
    display: 'table-row',
    width: '100%'
  });

  export const CellName = style({
    display: 'table-cell',
    width: '40%'
  });

  export const Cell = style({
    display: 'table-cell',
    width: '20%'
  });

  export const HeaderItem = style({
    display: 'flex',
  
    $nest: {
      '&:hover div': {
        fontWeight: 600,
        color: 'var(--jp-ui-font-color0)'
      },
      '&:focus div': {
        outline: 'none'
      },
      '&:active div': {
        fontWeight: 600,
        color: 'var(--jp-ui-font-color0)'
      }
    }
  });
  
  export const CurrentHeaderItem = style({
    $nest: {
      '& div': {
        color: 'var(--jp-ui-font-color0)',
        fontWeight: 'bold'
      }
    }
  });
  
  export const SortButton = style({
    transform: 'rotate(180deg)',
    marginLeft: '10px',
    color: 'var(--jp-ui-font-color2)',
    border: 'none',
    backgroundColor: 'var(--jp-layout-color0)',
    fontSize: 'var(--jp-ui-font-size1)'
  });
}
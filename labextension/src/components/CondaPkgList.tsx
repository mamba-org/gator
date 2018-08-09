import * as React from 'react';
import { CondaPkgItem } from './CondaPkgItem';
import { PackagesModel } from '../models';
import { style, classes } from 'typestyle';

export interface ITitleItemProps {
  title: string,
  field: TitleItem.SortField,  
  status: TitleItem.SortStatus,
  updateSort: (name: TitleItem.SortField, status: TitleItem.SortStatus) => void
}

export class TitleItem extends React.Component<ITitleItemProps>{
  render(){
    return (
      <div
        className={
          this.props.status === TitleItem.SortStatus.None
            ? PkgListStyle.HeaderItem
            : classes(PkgListStyle.HeaderItem, PkgListStyle.CurrentHeaderItem)
        }
        onClick={() => this.props.updateSort(this.props.field, this.props.status)}
      >
        {this.props.title}
      </div>
    );
  }
};

export namespace TitleItem {
  export enum SortStatus {
    Down = -1,
    None,
    Up,
  }

  export enum SortField {
    Name = 'NAME',
    Channel = 'CHANNEL',
    Status = 'STATUS',
    Version = 'VERSION'
  }
}

export interface IPkgListProps {
  packages: PackagesModel.IPackages,
  height: number,
  sortedBy: TitleItem.SortField,
  sortDirection: TitleItem.SortStatus,
  onSort: (field: TitleItem.SortField, status: TitleItem.SortStatus) => void,
  onPkgClick: (name: string) => void
}

/** Top level React component for widget */
export class CondaPkgList extends React.Component<IPkgListProps>{

  constructor(props){
    super(props);
  }

  render(){
    const listItems = Object.keys(this.props.packages).map((name, idx) => {
      let pkg = this.props.packages[name];
      return (
        <CondaPkgItem 
          name={pkg.name} 
          key={"pkg-" + idx} 
          status={pkg.status}
          updatable={pkg.updatable}
          version={pkg.version} 
          build={pkg.build}
          channel={pkg.channel}
          onClick={this.props.onPkgClick} />);
    });

    return (
      <div>
        <div className={PkgListStyle.Header}>
          <div className={PkgListStyle.CellStatus}>
            <TitleItem 
              title=''
              field={TitleItem.SortField.Status}
              updateSort={() => {}}
              status={
                this.props.sortedBy === TitleItem.SortField.Status 
                  ? this.props.sortDirection 
                  : TitleItem.SortStatus.None}/>
          </div>
          <div className={PkgListStyle.CellName}>
            <TitleItem
              title='Name'
              field={TitleItem.SortField.Name}
              updateSort={this.props.onSort}
              status={
                this.props.sortedBy === TitleItem.SortField.Name 
                  ? this.props.sortDirection 
                  : TitleItem.SortStatus.None}/>
          </div>
          <div className={PkgListStyle.Cell}>
            <TitleItem 
              title='Version'
              field={TitleItem.SortField.Version}
              updateSort={this.props.onSort}
              status={
                this.props.sortedBy === TitleItem.SortField.Version 
                  ? this.props.sortDirection 
                  : TitleItem.SortStatus.None}/>
          </div>
          <div className={PkgListStyle.Cell}>
            <TitleItem 
              title='Channel'
              field={TitleItem.SortField.Channel}
              updateSort={this.props.onSort}
              status={
                this.props.sortedBy === TitleItem.SortField.Channel 
                  ? this.props.sortDirection 
                  : TitleItem.SortStatus.None}/>
          </div>
        </div>
        <div className={PkgListStyle.List(this.props.height)}>
          {listItems}
        </div>
      </div>
    );
  }
}

export namespace PkgListStyle{
  export const List = (height: number) => {
    return  style({
      display: 'flex',
      height: 'calc(' + height + 'px - var(--jp-toolbar-micro-height))',
      flexDirection: 'column',
      width: '100%',
      overflowX: 'hidden',
      overflowY: 'auto'
    });
  };

  export const Header = style({
    color: 'var(--jp-ui-font-color1)',
    display: 'flex',
    flexDirection: 'row',
    width: 'calc(100% - 16px)', // Remove sidebar width
    fontWeight: 'bold',
    fontSize: 'var(--jp-ui-font-size2)'
  });

  export const Row = style({
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    flexShrink: 0
  });

  export const CellStatus = style({
    flex: '0 0 auto',
    padding: '0px 2px'
  });

  export const CellName = style({
    flex: '1 0 auto'
  });

  export const Cell = style({
    flex: '0 0 164px'
  });

  export const HeaderItem = style({
    display: 'flex',
    padding: '0px 5px'
  
    // $nest: {
    //   '&:hover div': {
    //     fontWeight: 600,
    //     color: 'var(--jp-ui-font-color0)'
    //   },
    //   '&:focus div': {
    //     outline: 'none'
    //   },
    //   '&:active div': {
    //     fontWeight: 600,
    //     color: 'var(--jp-ui-font-color0)'
    //   }
    // }
  });
  
  export const CurrentHeaderItem = style({
    $nest: {
      '&::after': {
        // content: `'🔻'`, //🔻🔺
        content: `'\\F0DD'`, // up \f0de
        fontFamily: 'FontAwesome',
        display: 'inline-block',
        textAlign: 'right',
        flex: '1 1 auto',
        padding: '0 5px'
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
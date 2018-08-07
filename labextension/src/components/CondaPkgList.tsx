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
    </div>
  );
}

export interface IPkgListProps extends PackagesModel.IPackages {
  height: number
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
      <div>
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
          {/* <div className={PkgListStyle.Cell}>
            <TitleItem 
              title='Build'
              updateSort={this.handleSort}
              active={false} />
          </div> */}
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
        content: `'🔻'`, //🔻🔺
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
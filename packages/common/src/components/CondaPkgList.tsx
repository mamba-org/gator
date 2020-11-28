import { faSquare } from '@fortawesome/free-regular-svg-icons/faSquare';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons/faCheckSquare';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons/faExternalLinkAlt';
import { faExternalLinkSquareAlt } from '@fortawesome/free-solid-svg-icons/faExternalLinkSquareAlt';
import { faMinusSquare } from '@fortawesome/free-solid-svg-icons/faMinusSquare';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HTMLSelect } from '@jupyterlab/ui-components';
import * as React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { classes, style } from 'typestyle';
import { NestedCSSProperties } from 'typestyle/lib/types';
import {
  CONDA_PACKAGES_PANEL_ID,
  CONDA_PACKAGE_SELECT_CLASS
} from '../constants';
import { Conda } from '../tokens';

const HEADER_HEIGHT = 29;

/**
 * Package list component properties
 */
export interface IPkgListProps {
  /**
   * Are package description available?
   */
  hasDescription: boolean;
  /**
   * Component height
   */
  height: number;
  /**
   * Conda package list
   */
  packages: Conda.IPackage[];
  /**
   * Package item click handler
   */
  onPkgClick: (pkg: Conda.IPackage) => void;
  /**
   * Package item version selection handler
   */
  onPkgChange: (pkg: Conda.IPackage, version: string) => void;
  /**
   * Package item graph dependencies handler
   */
  onPkgGraph: (pkg: Conda.IPackage) => void;
}

/** React component for the package list */
export class CondaPkgList extends React.Component<IPkgListProps> {
  public static defaultProps: Partial<IPkgListProps> = {
    hasDescription: false,
    packages: []
  };

  protected changeRender = (pkg: Conda.IPackage): JSX.Element => (
    <div className={'lm-Widget'}>
      <HTMLSelect
        className={classes(Style.VersionSelection, CONDA_PACKAGE_SELECT_CLASS)}
        value={pkg.version_selected}
        onClick={(evt: React.MouseEvent): void => {
          evt.stopPropagation();
        }}
        onChange={(evt: React.ChangeEvent<HTMLSelectElement>): void =>
          this.props.onPkgChange(pkg, evt.target.value)
        }
        aria-label="Package versions"
      >
        <option key="-3" value={'none'}>
          Remove
        </option>
        {!pkg.version_installed && (
          <option key="-2" value={''}>
            Install
          </option>
        )}
        {pkg.updatable && (
          <option key="-1" value={''}>
            Update
          </option>
        )}
        {pkg.version.map((v: string) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </HTMLSelect>
    </div>
  );

  protected iconRender = (pkg: Conda.IPackage): JSX.Element => {
    if (pkg.version_installed) {
      if (pkg.version_selected === 'none') {
        return (
          <FontAwesomeIcon
            icon={faMinusSquare}
            style={{ color: 'var(--jp-error-color1)' }}
          />
        );
      } else if (pkg.version_selected !== pkg.version_installed) {
        return (
          <FontAwesomeIcon
            icon={faExternalLinkSquareAlt}
            style={{ color: 'var(--jp-accent-color1)' }}
          />
        );
      }
      return (
        <FontAwesomeIcon
          icon={faCheckSquare}
          style={{ color: 'var(--jp-brand-color1)' }}
        />
      );
    } else if (pkg.version_selected !== 'none') {
      return (
        <FontAwesomeIcon
          icon={faCheckSquare}
          style={{ color: 'var(--jp-brand-color1)' }}
        />
      );
    }

    return (
      <FontAwesomeIcon
        icon={faSquare}
        style={{ color: 'var(--jp-ui-font-color2)' }}
      />
    );
  };

  protected isSelected(pkg: Conda.IPackage): boolean {
    if (pkg.version_installed) {
      if (pkg.version_selected === 'none') {
        return true;
      } else if (pkg.version_selected !== pkg.version_installed) {
        return true;
      }
    } else if (pkg.version_selected !== 'none') {
      return true;
    }
    return false;
  }

  protected nameRender = (pkg: Conda.IPackage): JSX.Element => {
    if (pkg.home?.length > 0) {
      // TODO possible enhancement - open in a JupyterLab Panel
      return (
        <a
          className={Style.Link}
          href={pkg.home}
          onClick={(evt): void => evt.stopPropagation()}
          target="_blank"
          rel="noopener noreferrer"
        >
          {pkg.name} <FontAwesomeIcon icon={faExternalLinkAlt} />
        </a>
      );
    }
    return <span>{pkg.name}</span>;
  };

  protected versionRender = (pkg: Conda.IPackage): JSX.Element => (
    <a
      className={pkg.updatable ? Style.Updatable : undefined}
      href="#"
      onClick={(evt): void => {
        evt.stopPropagation();
        this.props.onPkgGraph(pkg);
      }}
      rel="noopener noreferrer"
      title="Show dependency graph"
    >
      {pkg.version_installed}
    </a>
  );

  protected rowClassName = (index: number, pkg: Conda.IPackage): string => {
    if (index >= 0) {
      const isSelected = this.isSelected(pkg);
      return index % 2 === 0
        ? Style.RowEven(isSelected)
        : Style.RowOdd(isSelected);
    }
  };

  protected rowRenderer = (props: ListChildComponentProps): JSX.Element => {
    const { data, index, style } = props;
    const pkg = data[index] as Conda.IPackage;
    return (
      <div
        className={this.rowClassName(index, pkg)}
        style={style}
        onClick={(): void => {
          this.props.onPkgClick(pkg);
        }}
        role="row"
      >
        <div className={classes(Style.Cell, Style.StatusSize)} role="gridcell">
          {this.iconRender(pkg)}
        </div>
        <div className={classes(Style.Cell, Style.NameSize)} role="gridcell">
          {this.nameRender(pkg)}
        </div>
        {this.props.hasDescription && (
          <div
            className={classes(Style.CellSummary, Style.DescriptionSize)}
            role="gridcell"
            title={pkg.summary}
          >
            {pkg.summary}
          </div>
        )}
        <div className={classes(Style.Cell, Style.VersionSize)} role="gridcell">
          {this.versionRender(pkg)}
        </div>
        <div className={classes(Style.Cell, Style.ChangeSize)} role="gridcell">
          {this.changeRender(pkg)}
        </div>
        <div
          className={classes(Style.Cell, Style.ChannelSize)}
          role="gridcell"
          title={pkg.channel}
        >
          {pkg.channel}
        </div>
      </div>
    );
  };

  render(): JSX.Element {
    return (
      <div id={CONDA_PACKAGES_PANEL_ID} role="grid">
        <AutoSizer disableHeight>
          {({ width }): JSX.Element => {
            return (
              <>
                <div
                  className={Style.RowHeader}
                  style={{ width: width }}
                  role="row"
                >
                  <div
                    className={classes(Style.Cell, Style.StatusSize)}
                    role="columnheader"
                  ></div>
                  <div
                    className={classes(Style.Cell, Style.NameSize)}
                    role="columnheader"
                  >
                    Name
                  </div>
                  {this.props.hasDescription && (
                    <div
                      className={classes(Style.Cell, Style.DescriptionSize)}
                      role="columnheader"
                    >
                      Description
                    </div>
                  )}
                  <div
                    className={classes(Style.Cell, Style.VersionSize)}
                    role="columnheader"
                  >
                    Version
                  </div>
                  <div
                    className={classes(Style.Cell, Style.ChangeSize)}
                    role="columnheader"
                  >
                    Change To
                  </div>
                  <div
                    className={classes(Style.Cell, Style.ChannelSize)}
                    role="columnheader"
                  >
                    Channel
                  </div>
                </div>
                <FixedSizeList
                  height={Math.max(0, this.props.height - HEADER_HEIGHT)}
                  overscanCount={3}
                  itemCount={this.props.packages.length}
                  itemData={this.props.packages}
                  itemKey={(index, data): React.Key => data[index].name}
                  itemSize={40}
                  width={width}
                >
                  {this.rowRenderer}
                </FixedSizeList>
              </>
            );
          }}
        </AutoSizer>
      </div>
    );
  }
}

namespace Style {
  const row: NestedCSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  };

  export const RowHeader = style(row, {
    color: 'var(--jp-ui-font-color1)',
    fontWeight: 'bold',
    fontSize: 'var(--jp-ui-font-size2)',
    height: HEADER_HEIGHT,
    boxSizing: 'border-box',
    paddingRight: 17 // Take into account the package list scrollbar width
  });

  const rowContent: NestedCSSProperties = {
    fontSize: 'var(--jp-ui-font-size1)',
    color: 'var(--jp-ui-font-color0)',
    lineHeight: 'normal',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color3)'
      }
    }
  };

  export const RowEven = (selected: boolean): string =>
    style(row, rowContent, {
      background: selected ? 'var(--jp-brand-color3)' : 'unset'
    });

  export const RowOdd = (selected: boolean): string =>
    style(row, rowContent, {
      background: selected
        ? 'var(--jp-brand-color3)'
        : 'var(--jp-layout-color2)'
    });

  export const Cell = style({
    margin: '0px 2px',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden'
  });

  export const StatusSize = style({ flex: '0 0 12px', padding: '0px 2px' });
  export const NameSize = style({ flex: '1 1 200px' });
  export const DescriptionSize = style({ flex: '5 5 250px' });
  export const VersionSize = style({ flex: '0 0 90px' });
  export const ChangeSize = style({ flex: '0 0 120px' });
  export const ChannelSize = style({ flex: '1 1 120px' });

  export const CellSummary = style({
    margin: '0px 2px',
    alignSelf: 'flex-start',
    whiteSpace: 'normal',
    height: '100%',
    overflow: 'hidden'
  });

  export const SortButton = style({
    transform: 'rotate(180deg)',
    marginLeft: '10px',
    color: 'var(--jp-ui-font-color2)',
    border: 'none',
    backgroundColor: 'var(--jp-layout-color0)',
    fontSize: 'var(--jp-ui-font-size1)'
  });

  export const Link = style({
    $nest: {
      '&:hover': {
        textDecoration: 'underline'
      }
    }
  });

  export const Updatable = style({
    color: 'var(--jp-brand-color0)',

    $nest: {
      '&::before': {
        content: "'↗️'",
        paddingRight: 2
      }
    }
  });

  export const VersionSelection = style({
    width: '100%'
  });
}

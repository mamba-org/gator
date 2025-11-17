import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Menu } from '@lumino/widgets';
import { HTMLSelect, ToolbarButtonComponent } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { ellipsisVerticalIcon } from '../icon';
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
   * Is the package list loading?
   */
  isLoading: boolean;
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
  /**
   * Command registry
   */
  commands?: CommandRegistry;
  /**
   * Environment name
   */
  envName?: string;
}

/** React component for the package list */
export class CondaPkgList extends React.Component<IPkgListProps> {
  public static defaultProps: Partial<IPkgListProps> = {
    hasDescription: false,
    packages: [],
    isLoading: false
  };

  componentDidMount(): void {
    if (
      typeof document !== 'undefined' &&
      !document.getElementById('spinner-keyframes')
    ) {
      const style = document.createElement('style');
      style.id = 'spinner-keyframes';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

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
            icon="minus-square"
            style={{ color: 'var(--jp-error-color1)' }}
          />
        );
      } else if (pkg.version_selected !== pkg.version_installed) {
        return (
          <FontAwesomeIcon
            icon="external-link-square-alt"
            style={{ color: 'var(--jp-accent-color1)' }}
          />
        );
      }
      return (
        <FontAwesomeIcon
          icon="check-square"
          style={{ color: 'var(--jp-brand-color1)' }}
        />
      );
    } else if (pkg.version_selected !== 'none') {
      return (
        <FontAwesomeIcon
          icon="check-square"
          style={{ color: 'var(--jp-brand-color1)' }}
        />
      );
    }

    return (
      <FontAwesomeIcon
        icon={['far', 'square']}
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
          {pkg.name} <FontAwesomeIcon icon="external-link-alt" />
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

  private createPackageMenu = (
    pkg: Conda.IPackage,
    commands: CommandRegistry
  ): Menu => {
    const menu = new Menu({ commands });

    if (pkg.version_installed) {
      if (pkg.updatable) {
        menu.addItem({
          command: 'gator-lab:update-pkg',
          args: { name: pkg.name, environment: this.props.envName }
        });
      }
      menu.addItem({
        command: 'gator-lab:remove-pkg',
        args: { name: pkg.name, environment: this.props.envName }
      });
    }

    return menu;
  };

  protected rowRenderer = (props: ListChildComponentProps): JSX.Element => {
    const { data, index, style } = props;
    const pkg = data[index] as Conda.IPackage;
    let iconRef: HTMLDivElement | null = null;

    const handleMenuClick = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!this.props.commands || !this.props.envName) {
        return;
      }

      const rect = iconRef?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const menu = this.createPackageMenu(pkg, this.props.commands);

      const menuWidth = 90;

      // Position menu so it opens to the LEFT of the icon
      const x = rect.left - menuWidth;
      const y = rect.bottom + 4;

      menu.open(x, y);
    };

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
        {this.props.commands && this.props.envName && (
          <div className={classes(Style.Cell, Style.KebabSize)} role="gridcell">
            <div
              ref={el => {
                iconRef = el;
              }}
              onClick={handleMenuClick}
              className={Style.Kebab}
              title="Package actions"
              aria-label={`Actions for ${pkg.name} package`}
              aria-haspopup="menu"
            >
              <ToolbarButtonComponent icon={ellipsisVerticalIcon} />
            </div>
          </div>
        )}
      </div>
    );
  };

  render(): JSX.Element {
    return (
      <div
        id={CONDA_PACKAGES_PANEL_ID}
        role="grid"
        className={classes(Style.Container)}
      >
        <AutoSizer>
          {({
            width,
            height
          }: {
            width: number;
            height: number;
          }): JSX.Element => {
            if (this.props.isLoading) {
              return (
                <div
                  className={Style.LoadingContainer}
                  style={{ height: height, width: width }}
                >
                  <div className={Style.LoadingSpinner}>
                    <div className={Style.Spinner}></div>
                    <div className={Style.LoadingText}>Loading packages...</div>
                  </div>
                </div>
              );
            }

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
                  {this.props.commands && this.props.envName && (
                    <div
                      className={classes(Style.Cell, Style.KebabSize)}
                      role="columnheader"
                    ></div>
                  )}
                </div>
                <FixedSizeList
                  height={Math.max(0, height - HEADER_HEIGHT)}
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
  export const Container = style({
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    overflow: 'hidden'
  });

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
  export const KebabSize = style({ flex: '0 0 40px' });

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

  export const LoadingContainer = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    minHeight: '200px'
  });

  export const LoadingSpinner = style({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  });

  export const Spinner = style({
    width: '40px',
    height: '40px',
    border: '4px solid var(--jp-layout-color3)',
    borderTop: '4px solid var(--jp-brand-color1)',
    borderRadius: '50%',
    flexShrink: 0,
    animation: 'spin 1s linear infinite'
  });

  export const LoadingText = style({
    color: 'var(--jp-ui-font-color1)',
    fontSize: 'var(--jp-ui-font-size1)',
    fontWeight: '500',
    textAlign: 'center'
  });

  export const Kebab = style({
    cursor: 'pointer',
    padding: '0 5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
}

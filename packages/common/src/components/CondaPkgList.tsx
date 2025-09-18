import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HTMLSelect, ToolbarButtonComponent } from '@jupyterlab/ui-components';
import { Menu } from '@lumino/widgets';
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
import { CommandRegistry } from '@lumino/commands';
import { ellipsisVerticalIcon } from '../icon';

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
  /**
   * Command registry for menu actions
   */
  commands: CommandRegistry;
  /**
   * Environment name
   */
  envName: string;
}

const toArray = <T,>(x: T | T[] | null | undefined): T[] =>
  Array.isArray(x) ? x : x === null ? [] : [x];

const toStr = (x: unknown) => (x === null ? '' : String(x));

const getVersions = (pkg: Conda.IPackage) =>
  toArray<string>(pkg.version).map(toStr);

export const createMenu = (
  commands: CommandRegistry,
  envName: string,
  packages: Conda.IPackage[]
): Menu => {
  console.log('createMenu called with:', { commands, envName, packages });

  const menu = new Menu({ commands });
  const packageNames = packages.map(pkg => pkg.name);
  console.log('Package names for menu:', packageNames);

  console.log('Available commands:', commands.listCommands());

  const commandsToAdd = [
    'gator-lab:pkg-update-all-confirm',
    'gator-lab:pkg-update',
    'gator-lab:pkg-refresh-available',
    'gator-lab:pkg-apply-modifications'
  ];

  commandsToAdd.forEach(cmd => {
    if (commands.hasCommand(cmd)) {
      console.log(`Adding command: ${cmd}`);
    } else {
      console.warn(`Command not found: ${cmd}`);
    }
  });

  // menu.addItem({
  //   command: 'gator-lab:pkg-update-all-confirm',
  //   args: { names: packageNames }
  // });

  menu.addItem({
    command: 'gator-lab:pkg-update',
    args: { env: envName, names: packageNames }
  });

  // menu.addItem({
  //   command: 'gator-lab:pkg-refresh-available',
  //   args: {}
  // });

  menu.addItem({
    command: 'gator-lab:pkg-apply-modifications',
    args: { env: envName, pkgNames: packageNames }
  });

  // Ensure menu has proper styling
  menu.node.classList.add('lm-Menu', 'jp-Menu');
  menu.node.style.minWidth = '200px';

  console.log('Menu items added:', menu.items.length);
  console.log('Menu node after adding items:', menu.node);
  console.log('Menu node children:', menu.node.children);
  console.log('Menu node innerHTML:', menu.node.innerHTML);

  setTimeout(() => {
    console.log('Menu node after timeout:', menu.node);
    console.log('Menu node children after timeout:', menu.node.children);
    console.log('Menu node innerHTML after timeout:', menu.node.innerHTML);

    const menuItems = menu.node.querySelectorAll('.lm-Menu-item');
    console.log('Found menu items:', menuItems.length);
    menuItems.forEach((item, index) => {
      console.log(`Menu item ${index}:`, item);
      console.log(`Menu item ${index} text:`, item.textContent);
      console.log(`Menu item ${index} classes:`, item.className);
    });
  }, 100);

  return menu;
};

/** React component for the package list */
export class CondaPkgList extends React.Component<IPkgListProps> {
  public static defaultProps: Partial<IPkgListProps> = {
    hasDescription: false,
    packages: []
  };

  protected handleMenuClick = (
    event: React.MouseEvent,
    pkg: Conda.IPackage
  ) => {
    console.log('handleMenuClick', pkg);
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    const x = rect.left;
    const y = rect.bottom + 4;

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    console.log('Menu position options:', {
      rect,
      buttonPos: { x, y },
      mousePos: { x: mouseX, y: mouseY }
    });

    const menu = createMenu(this.props.commands, this.props.envName, [pkg]);
    console.log('Menu created:', menu);

    menu.node.style.zIndex = '9999';
    menu.node.style.position = 'fixed';

    menu.node.classList.remove('lm-mod-hidden');

    // Try positioning relative to the button first
    try {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust x and x position if it would be off-screen
      let adjustedX = x;
      if (x > viewportWidth - 200) {
        adjustedX = viewportWidth - 220;
      }

      let adjustedY = y;
      if (y > viewportHeight - 150) {
        adjustedY = rect.top - 150;
      }

      console.log('Adjusted position:', {
        original: { x, y },
        adjusted: { x: adjustedX, y: adjustedY },
        viewport: { width: viewportWidth, height: viewportHeight }
      });

      menu.open(adjustedX, adjustedY);

      // Check for menu items after opening
      setTimeout(() => {
        const menuItems = menu.node.querySelectorAll('.lm-Menu-item');
        menuItems.forEach((item, index) => {
          console.log(`Opened menu item ${index}:`, item.textContent);
        });
      }, 50);
    } catch (error) {
      console.error('Failed to open menu at button position:', error);
      // Fallback to mouse position
      try {
        menu.open(mouseX, mouseY);
        console.log('Menu opened at mouse position:', mouseX, mouseY);
        console.log('Menu node after fallback opening:', menu.node);
        console.log('Menu node classes:', menu.node.className);
        console.log('Menu node style:', menu.node.style.cssText);
        console.log(
          'Menu node children after fallback opening:',
          menu.node.children
        );
        console.log(
          'Menu node innerHTML after fallback opening:',
          menu.node.innerHTML
        );

        // Check for menu items after fallback opening
        setTimeout(() => {
          const menuItems = menu.node.querySelectorAll('.lm-Menu-item');
          menuItems.forEach((item, index) => {
            console.log(`Fallback menu item ${index}:`, item.textContent);
          });
        }, 50);
      } catch (fallbackError) {
        console.error('Failed to open menu at mouse position:', fallbackError);
      }
    }
  };

  protected handleContextMenu = (
    event: React.MouseEvent,
    pkg: Conda.IPackage
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const menu = createMenu(this.props.commands, this.props.envName, [pkg]);

    menu.node.style.zIndex = '9999';
    menu.node.style.position = 'fixed';

    menu.node.classList.remove('lm-mod-hidden');

    menu.open(event.clientX, event.clientY);

    setTimeout(() => {
      const menuItems = menu.node.querySelectorAll('.lm-Menu-item');
      menuItems.forEach((item, index) => {
        console.log(`Context menu item ${index}:`, item.textContent);
      });
    }, 50);
  };

  protected changeRender = (pkg: Conda.IPackage): JSX.Element => {
    const versions = getVersions(pkg);
    return (
      <div className={'lm-Widget'}>
        <HTMLSelect
          className={classes(
            Style.VersionSelection,
            CONDA_PACKAGE_SELECT_CLASS
          )}
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
            <option key="-1" value="">
              Update
            </option>
          )}
          {versions.map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </HTMLSelect>
      </div>
    );
  };

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

  protected rowRenderer = (props: ListChildComponentProps): JSX.Element => {
    const { data, index, style } = props;
    const pkg = data[index] as Conda.IPackage;

    if (!pkg) {
      return (
        <div style={style} role="row">
          <div>Loading...</div>
        </div>
      );
    }

    return (
      <div
        className={this.rowClassName(index, pkg)}
        style={style}
        onClick={(): void => {
          this.props.onPkgClick(pkg);
        }}
        onContextMenu={(event: React.MouseEvent) =>
          this.handleContextMenu(event, pkg)
        }
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
          {this.changeRender(pkg)}
        </div>
        <div
          className={classes(Style.Cell, Style.ChannelSize)}
          role="gridcell"
          title={pkg.channel}
        >
          {pkg.channel}
        </div>
        <div
          className={classes(Style.Cell, Style.ChangeSize)}
          role="gridcell"
        ></div>
        <div
          className={Style.KebabButton}
          onClick={(event: React.MouseEvent) =>
            this.handleMenuClick(event, pkg)
          }
          title="Package actions"
          aria-label={`Actions for ${pkg.name} package`}
          aria-haspopup="menu"
        >
          <ToolbarButtonComponent icon={ellipsisVerticalIcon} />
        </div>
      </div>
    );
  };

  render(): JSX.Element {
    const items = Array.isArray(this.props.packages) ? this.props.packages : [];

    // Early return if no items to prevent render issues
    if (!items || items.length === 0) {
      return (
        <div
          id={CONDA_PACKAGES_PANEL_ID}
          role="grid"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div>No packages available</div>
        </div>
      );
    }

    return (
      <div
        id={CONDA_PACKAGES_PANEL_ID}
        role="grid"
        style={{ flex: 1, display: 'flex' }}
      >
        <AutoSizer>
          {({
            width,
            height
          }: {
            width: number;
            height: number;
          }): JSX.Element => {
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
                    Channel
                  </div>
                  <div
                    className={classes(Style.Cell, Style.ChannelSize)}
                    role="columnheader"
                  >
                    Build
                  </div>
                </div>
                <FixedSizeList
                  height={Math.max(0, height - HEADER_HEIGHT)}
                  overscanCount={3}
                  itemCount={items.length}
                  itemData={items}
                  itemKey={(index, data) => data[index]?.name ?? String(index)}
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

  export const ActionSize = style({
    flex: '0 0 28px',
    display: 'flex',
    justifyContent: 'flex-end'
  });

  export const KebabButton = style({
    width: 24,
    height: 24,
    lineHeight: '24px',
    textAlign: 'center',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--jp-ui-font-color2)',
    $nest: {
      '&:hover': { color: 'var(--jp-ui-font-color1)' },
      '&:focus': { outline: '2px solid var(--jp-brand-color1)' }
    }
  });
}

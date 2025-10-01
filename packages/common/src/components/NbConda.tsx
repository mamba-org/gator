import { Notification, ToolbarButtonComponent } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import { Menu } from '@lumino/widgets';
import * as React from 'react';
import { style } from 'typestyle';
import { Conda, IEnvironmentManager } from '../tokens';
import { CondaEnvList, ENVIRONMENT_PANEL_WIDTH } from './CondaEnvList';
import { PACKAGE_TOOLBAR_HEIGHT } from './CondaPkgToolBar';
import { CreateEnvButton } from './CreateEnvButton';
import { CondaPkgPanel } from './CondaPkgPanel';
import { syncAltIcon } from '../icon';
import { openCreateEnvDialog } from './CreateEnvDialog';

/**
 * Jupyter Conda Component properties
 */
export interface ICondaEnvProps {
  /**
   * Component height
   */
  height: number;
  /**
   * Component width
   */
  width: number;
  /**
   * Environment manager
   */
  model: IEnvironmentManager;
  commands: CommandRegistry;
  /**
   * Environment name
   */
  envName?: string;
}

/**
 * Jupyter Conda Component state
 */
export interface ICondaEnvState {
  /**
   * Environment list
   */
  environments: Array<Conda.IEnvironment>;
  /**
   * Active environment
   */
  currentEnvironment?: string;
  /**
   * Conda channels
   */
  channels?: Conda.IChannels;
  /**
   * Is the environment list loading?
   */
  isLoading: boolean;
  /**
   * Is the package list loading?
   */
  isPackageLoading: boolean;
  /**
   * Environment name
   */
  envName?: string;
}

/** Top level React component for Jupyter Conda Manager */
export class NbConda extends React.Component<ICondaEnvProps, ICondaEnvState> {
  private iconRef = React.createRef<HTMLDivElement>();

  constructor(props: ICondaEnvProps) {
    super(props);

    this.state = {
      environments: [],
      currentEnvironment: undefined,
      isLoading: false,
      isPackageLoading: false,
      envName: props.envName
    };

    this.handleEnvironmentChange = this.handleEnvironmentChange.bind(this);
    this.handleOpenCreateEnvDialog = this.handleOpenCreateEnvDialog.bind(this);

    this.props.model.refreshEnvs.connect(() => {
      this.loadEnvironments();
    });

    this.props.model.envAdded.connect((_, { name }) => {
      this.setState({ currentEnvironment: name });
    });

    this.props.model.envRemoved.connect((_, removedName) => {
      if (removedName === this.state.currentEnvironment) {
        this.setState({ currentEnvironment: undefined, channels: undefined });
      }
    });
  }

  createRefreshMenu(): Menu {
    const menu = new Menu({ commands: this.props.commands });

    const refreshEnvsCommandId = 'temp-refresh-envs';
    const refreshPackagesCommandId = 'temp-refresh-packages';

    if (!this.props.commands.hasCommand(refreshEnvsCommandId)) {
      this.props.commands.addCommand(refreshEnvsCommandId, {
        label: 'Refresh Environments',
        execute: () => {
          setTimeout(() => {
            this.loadEnvironments();
          }, 0);
        }
      });
    }

    if (!this.props.commands.hasCommand(refreshPackagesCommandId)) {
      this.props.commands.addCommand(refreshPackagesCommandId, {
        label: 'Refresh Packages',
        execute: () => {
          setTimeout(async () => {
            if (this.state.currentEnvironment) {
              this.setState({ isPackageLoading: true });

              const packageManager = this.props.model.getPackageManager(
                this.state.currentEnvironment
              );
              if (packageManager) {
                try {
                  await packageManager.refresh();
                } catch (error) {
                  console.error('Error refreshing packages:', error);
                } finally {
                  this.setState({ isPackageLoading: false });
                }
              } else {
                this.setState({ isPackageLoading: false });
              }
            }
          }, 0);
        }
      });
    }

    menu.addItem({ command: refreshEnvsCommandId });
    menu.addItem({ command: refreshPackagesCommandId });

    return menu;
  }

  async handleEnvironmentChange(name: string): Promise<void> {
    this.setState({
      currentEnvironment: name,
      channels: await this.props.model.getChannels(name),
      envName: name
    });
  }

  async handleOpenCreateEnvDialog(): Promise<void> {
    const choice = await openCreateEnvDialog();
    if (choice === 'manual') {
      await this.props.commands.execute('gator-lab:create-env');
    } else if (choice === 'import') {
      await this.props.commands.execute('gator-lab:import-env');
    } else {
      return;
    }
  }

  async handleRefreshMenuClick(
    iconRef: React.RefObject<HTMLDivElement>,
    event?: React.MouseEvent
  ): Promise<void> {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    let x = rect.left;
    let y = rect.bottom + 4;

    const menu = this.createRefreshMenu();

    document.body.appendChild(menu.node);
    menu.node.style.visibility = 'hidden';
    menu.node.style.position = 'absolute';
    menu.node.style.top = '0';
    menu.node.style.left = '0';

    menu.node.offsetHeight;

    const menuRect = menu.node.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10; // 10px margin from edge
    }
    if (y + menuRect.height > viewportHeight) {
      y = rect.top - menuRect.height - 4; // Above the button

      // If still off-screen, position at top of viewport
      if (y < 0) {
        y = 10; // 10px margin from top
      }
    }

    document.body.removeChild(menu.node);
    menu.node.style.visibility = '';
    menu.node.style.position = '';
    menu.node.style.top = '';
    menu.node.style.left = '';

    menu.open(x, y);
  }

  async loadEnvironments(): Promise<void> {
    if (!this.state.isLoading) {
      this.setState({ isLoading: true });
      try {
        const newState: Partial<ICondaEnvState> = {
          environments: await this.props.model.environments
        };

        const targetEnv: string | undefined =
          this.props.envName ||
          this.state.currentEnvironment ||
          newState.environments.find(env => env.is_default)?.name ||
          newState.environments.find(env => env.name === 'base')?.name ||
          newState.environments[0]?.name;

        if (targetEnv && targetEnv !== this.state.currentEnvironment) {
          newState.currentEnvironment = targetEnv;
          newState.channels = await this.props.model.getChannels(targetEnv);
        }

        newState.isLoading = false;
        this.setState(newState as ICondaEnvState);
      } catch (error) {
        if (error !== 'cancelled') {
          console.error(error);
          Notification.error((error as any).message);
        }
      }
    }
  }

  componentDidMount(): void {
    this.loadEnvironments();
  }

  render(): JSX.Element {
    return (
      <div className={Style.HeaderContainer}>
        <div className={Style.Grow}>
          <div className={Style.Title}>Environments</div>
          <div className={Style.RefreshButton}>
            <div
              data-loading={this.state.isLoading}
              className={Style.RefreshInner}
            >
              <div ref={this.iconRef}>
                <ToolbarButtonComponent
                  icon={syncAltIcon}
                  onClick={() => {
                    this.handleRefreshMenuClick(this.iconRef);
                  }}
                  label="Refresh"
                  className={Style.RefreshEnvsIconLabelGap}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={Style.Panel}>
          {/* LEFT COLUMN */}
          <div className={Style.LeftPane}>
            <div
              className={`lm-Widget ${Style.LeftToolbar} ${Style.ToggleCreateEnvDialogButton}`}
            >
              <CreateEnvButton onOpen={this.handleOpenCreateEnvDialog} />
            </div>

            <div className={Style.EnvListContainer}>
              <CondaEnvList
                isPending={this.state.isLoading}
                environments={this.state.environments}
                selected={this.state.currentEnvironment}
                onSelectedChange={this.handleEnvironmentChange}
                onOpen={this.handleOpenCreateEnvDialog}
                commands={this.props.commands}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <CondaPkgPanel
            height={this.props.height}
            width={this.props.width - ENVIRONMENT_PANEL_WIDTH}
            packageManager={this.props.model.getPackageManager(
              this.state.currentEnvironment
            )}
            environmentName={this.state.currentEnvironment}
            isPackageLoading={this.state.isPackageLoading}
          />
        </div>
      </div>
    );
  }
}

namespace Style {
  export const Panel = style({
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    borderCollapse: 'collapse',
    height: '100%',
    minHeight: 0
  });

  export const HeaderContainer = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    height: '100%',
    minHeight: 0
  });

  export const Grow = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    backgroundColor: 'var(--jp-layout-color1)'
  });

  export const Title = style({
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '15px',
    color: 'var(--jp-ui-font-color1)',
    fontWeight: 600,
    fontSize: 'var(--jp-ui-font-size2)',
    lineHeight: 1.2,
    whiteSpace: 'nowrap'
  });

  export const RefreshButton = style({
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '8px',
    whiteSpace: 'nowrap'
  });

  export const RefreshInner = style({
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: '6px'
  });

  export const RefreshEnvsIconLabelGap = style({
    $nest: {
      '.jp-ToolbarButtonComponent-label': {
        marginLeft: '6px'
      }
    }
  });

  export const LeftPane = style({
    display: 'flex',
    flexDirection: 'column',
    width: ENVIRONMENT_PANEL_WIDTH,
    minWidth: ENVIRONMENT_PANEL_WIDTH,
    height: '100%',
    minHeight: 0
  });

  export const LeftToolbar = style({
    display: 'flex',
    alignItems: 'stretch',
    height: PACKAGE_TOOLBAR_HEIGHT,
    flexShrink: 0
  });

  export const ToggleCreateEnvDialogButton = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: PACKAGE_TOOLBAR_HEIGHT,
    flexShrink: 0,
    $nest: {
      '& > .jp-ToolbarButtonComponent, & > jp-button.jp-ToolbarButtonComponent':
        {
          width: '100% !important',
          height: '100% !important',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 0
        },
      '& > .jp-ToolbarButtonComponent .jp-ToolbarButtonComponent-label': {
        marginLeft: '6px',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }
    }
  });

  export const EnvListContainer = style({
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'hidden'
  });
}

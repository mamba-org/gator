import { ReactWidget } from '@jupyterlab/apputils';

import {
  Graph,
  GraphData,
  GraphNode,
  GraphLink,
  GraphConfiguration
} from 'react-d3-graph';

import * as React from 'react';

import { Conda } from '../tokens';

/**
 * Package graph property
 */
export interface IPkgGraphProps {
  /**
   * Package manager for the selected environment
   */
  pkgManager: Conda.IPackageManager;
  /**
   * Package name
   */
  package: string;
  /**
   * Graph configuration
   */
  config: GraphConfiguration<GraphNode, GraphLink> | Record<string, any>;
}

/**
 * Package graph state
 */
export interface IPkgGraphState {
  /**
   * Graph data
   */
  data: GraphData<GraphNode, GraphLink> | null;
  /**
   * Error message
   */
  error: React.ReactNode;
}

export class PkgGraph extends React.Component<IPkgGraphProps, IPkgGraphState> {
  public static defaultProps: Partial<IPkgGraphProps> = {
    config: {
      directed: true,
      collapsible: true,
      highlightDegree: 1,
      highlightOpacity: 0.1,
      nodeHighlightBehavior: true,
      linkHighlightBehavior: true,
      node: {
        color: 'var(--jp-brand-color1)',
        highlightColor: 'var(--jp-brand-color2)',
        highlightStrokeColor: 'var(--jp-brand-color2)',
        highlightFontSize: 'var(--jp-ui-font-size0)',
        fontSize: '--jp-ui-font-size0',
        fontColor: 'var(--jp-ui-font-color1)'
      },
      link: {
        highlightColor: 'var(--jp-brand-color2)'
      }
    }
  };

  constructor(props: IPkgGraphProps) {
    super(props);
    this.state = {
      data: null,
      error: null
    };
  }

  componentDidMount(): void {
    this._updatePackages();
  }

  componentDidUpdate(prevProps: IPkgGraphProps): void {
    if (this.props.package !== prevProps.package) {
      this._updatePackages();
    }
  }

  private async _updatePackages(): Promise<void> {
    try {
      const available = await this.props.pkgManager.getDependencies(
        this.props.package,
        true
      );
      const data: GraphData<GraphNode, GraphLink> = { nodes: [], links: [] };
      let error: React.ReactNode = null;
      if (available[this.props.package] === null) {
        // Manager does not support dependency query
        error = (
          <span>
            Please install{' '}
            <a
              style={{ textDecoration: 'underline' }}
              href="https://github.com/mamba-org/mamba"
              rel="noreferrer"
              target="_blank"
            >
              mamba
            </a>{' '}
            manager to resolve dependencies.
          </span>
        );
      } else {
        Object.keys(available).forEach(key => {
          if (key === this.props.package) {
            data.nodes.push({ id: key, color: 'orange' });
          } else {
            data.nodes.push({ id: key });
          }

          available[key].forEach(dep => {
            const dependencie = dep.split(' ')[0];
            if (!data.nodes.find(value => value.id === dependencie)) {
              data.nodes.push({ id: dependencie });
            }
            data.links.push({ source: key, target: dependencie });
          });
        });
        if (data.nodes.length === 0) {
          error = <span>This is a pip package</span>;
        }
      }
      this.setState({ data, error });
    } catch (error) {
      if (error.message !== 'cancelled') {
        console.error('Error when looking for dependencies.', error);
      }
    }
  }

  render(): JSX.Element {
    return (
      <div>
        {this.state.data === null ? (
          <span>Loading dependencies</span>
        ) : (
          <div>
            {this.state.error || (
              <Graph
                id="graph-id"
                data={this.state.data}
                config={this.props.config}
              />
            )}
          </div>
        )}
      </div>
    );
  }
}

export class PkgGraphWidget extends ReactWidget {
  constructor(pkgManager: Conda.IPackageManager, pkg: string) {
    super();
    this._package = pkg;
    this._pkgManager = pkgManager;
  }

  render(): JSX.Element {
    return <PkgGraph package={this._package} pkgManager={this._pkgManager} />;
  }

  private _pkgManager: Conda.IPackageManager;
  private _package: string;
}

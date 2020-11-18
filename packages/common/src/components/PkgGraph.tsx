import {
  ReactWidget
} from '@jupyterlab/apputils';

import { Graph, GraphData, GraphNode, GraphLink, GraphConfiguration } from "react-d3-graph";

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
  config: GraphConfiguration<GraphNode, GraphLink> | Object;
}

/**
 * Package graph state
 */
export interface IPkgGraphState {
  /**
   * Graph data
   */
  data: GraphData<GraphNode, GraphLink> | null;
}

export class PkgGraph extends React.Component<IPkgGraphProps, IPkgGraphState> {
  public static defaultProps: Partial<IPkgGraphProps> = {
    config: {
      directed: true,
      collapsible: true,
      highlightDegree: 1,
      highlightOpacity: 0.3,
      nodeHighlightBehavior: true,
      linkHighlightBehavior: true,
      node: {
        color: 'var(--jp-brand-color1)',
        highlightStrokeColor: 'var(--jp-brand-color2)',
        fontColor: 'var(--jp-ui-font-color1)',
      },
      link: { 
        highlightColor: 'var(--jp-brand-color2)',
      },
    }
  };

  constructor(props: IPkgGraphProps) {
    super(props);
    this.state = {
      data: null
    }
  }

  componentDidMount() {
    this._updatePackages();
  }

  componentDidUpdate(prevProps: IPkgGraphProps): void {
    this._updatePackages();
  }

  private async _updatePackages(): Promise<void> {
    try {
      const available =  await this.props.pkgManager.getDependencies(this.props.package, true);
      const data: GraphData<GraphNode, GraphLink>  = { nodes: [], links: [] };
      
      Object.keys(available).forEach( key => {
        data.nodes.push({ id: key });
        available[key].forEach( dep => {
          const dependencie = dep.split(' ')[0];
          if (!data.nodes.find(value => value.id === dependencie)) {
            data.nodes.push({ id: dependencie });
          }
          data.links.push({ source: key, target: dependencie });
        });
      });
      
      this.setState({ data });
    } catch (error) {
      if (error.message !== 'cancelled') {
        console.error('Error when looking for dependencies.', error);
      }
    }
  }

  render(): JSX.Element {
    return (
      <div>
        {
          this.state.data === null
          ?
            <span>Loading dependencies</span>
          :
          <div>
            {
              this.state.data.nodes.length !== 0
              ? 
                <Graph id="graph-id" data={this.state.data} config={this.props.config}/>
              :
                <span>This is a pip package</span>
            }
          </div>
        }
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
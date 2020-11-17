import {
  ReactWidget
} from '@jupyterlab/apputils';

import { Graph, GraphData, GraphNode, GraphLink } from "react-d3-graph";

import * as React from 'react';

import { Conda } from '../tokens';

export class PkgGraph extends ReactWidget {
  constructor(pkgManager: Conda.IPackageManager, pkg: string) {
    super();
    this._package = pkg;
    this._pkgManager = pkgManager;
    this._loading = true;

    // create a network
    this._data = { nodes: [], links: [] };
    if (this._package) this._updatePackages();
  }

  public showGraph(pkg: string): void {
    this._package = pkg;
    this._updatePackages();
  }

  private async _updatePackages(): Promise<void> {
    this._loading = true;
    this.update();

    this._pkgManager.getDependencies(this._package, true)
    .then( available => {
      this._data.nodes = [];
      this._data.links = [];
      
      Object.keys(available).forEach( key => {
        this._data.nodes.push({ id: key });
        available[key].forEach( dep => {
          const dependencie = dep.split(' ')[0];
          if (!this._data.nodes.find(value => value.id === dependencie)) {
            this._data.nodes.push({ id: dependencie });
          }
          this._data.links.push({ source: key, target: dependencie });
        });
      });
      
      this._loading = false;
      this.update();
    })
  }

  render(): JSX.Element {
    const config = {
      nodeHighlightBehavior: true,
      node: {
        color: "lightblue",
        highlightStrokeColor: "blue",
      },
      link: { highlightColor: "blue" },
    };
    return (
      <div>
        {
          this._loading
          ?
            <span>Loading dependencies</span>
          :
          <div>
            {
              this._data.nodes.length !== 0
              ? 
                <Graph id="graph-id" data={this._data} config={config}/>
              :
                <span>This is a pip package</span>
            }
          </div>
        }
      </div>
    );
  }

  private _pkgManager: Conda.IPackageManager;
  private _data: GraphData<GraphNode, GraphLink>;
  private _package: string;
  private _loading: boolean;
}
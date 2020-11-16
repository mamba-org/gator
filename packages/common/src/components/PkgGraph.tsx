import {
  MainAreaWidget,
  ReactWidget
} from '@jupyterlab/apputils';

import { HTMLSelect } from '@jupyterlab/ui-components';

import { Graph, GraphData, GraphNode, GraphLink } from "react-d3-graph";

import * as React from 'react';

import { CondaEnvironments } from '../services';

import { Conda } from '../tokens';

class PkgGraph extends ReactWidget {
  constructor(pkgManager: Conda.IPackageManager) {
    super();
    this._package = '';
    this._pkgManager = pkgManager;

    // create a network
    this._data = { nodes: [], links: [] };
  }

  public showGraph(pkg: string): void {
    this._package = pkg;
    this._updatePackages();
  }

  private async _updatePackages(): Promise<void> {
    const available = await this._pkgManager.getDependencies(this._package, true);
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
    
    this.update();
  }

  render(): JSX.Element {
    const config = {
      width: this.node.clientWidth,
      height: this.node.clientHeight,
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
          this._data.nodes.length !== 0 
          ?
          <Graph id="graph-id" data={this._data} config={config}/>
          :
          <div>
            {this._package.length > 0 && <h4>{this._package} doesn't have dependencies</h4>}
          </div>
        }
      </div>
    );
  }

  private _pkgManager: Conda.IPackageManager;
  private _data: GraphData<GraphNode, GraphLink>;
  private _package: string;
}

export class GraphContainer extends MainAreaWidget<PkgGraph> {
  constructor(model: CondaEnvironments) {
    super({ content: new PkgGraph(model.getPackageManager()) });
    this.toolbar.addItem('envs', new EnvSwitcher(this.content, model));
  }
}

class EnvSwitcher extends ReactWidget {
  constructor(graph: PkgGraph, model: CondaEnvironments) {
    super();
    this.addClass('jp-LogConsole-toolbarLogLevel');
    this._graph = graph;
    this._model = model;
    this._selectedPkg = '';
    this._selectedPkg = '';
    this._envs = [];
    this._pkgs = [];

    this._pkgManager = this._model.getPackageManager();

    this._model.environments
    .then( (envs: Conda.IEnvironment[]) => {
      envs.forEach( (env: Conda.IEnvironment) => {
        this._envs.push(env.name);
        if (env.is_default) {
          this._selectedEnv = env.name;
        }
      });

      this._pkgManager.refresh(true, this._selectedEnv)
      .then( pkgs => {
        pkgs.forEach( pkg => {
          this._pkgs.push(pkg.name);
        });
        if (this._pkgs.length > 0) {
          this._selectedPkg = this._pkgs[0];
          this._graph.showGraph(this._selectedPkg);
        }
        this.update();
      });
    });
  }

  private handleEnv = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this._selectedEnv = event.target.value;
    this._pkgs = [];
    this._pkgManager.refresh(false, this._selectedEnv)
    .then( pkgs => {
      pkgs.forEach( pkg => {
        this._pkgs.push(pkg.name);
      });
      if (this._pkgs.length > 0) {
        this._selectedPkg = this._pkgs[0];
        this._graph.showGraph(this._selectedPkg);
      }
      this.update();
    });
  };

  private handlePkg = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this._selectedPkg = event.target.value;
    this._graph.showGraph(this._selectedPkg);
    this.update();
  };

  private handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.keyCode === 13) this._graph.update();
  };

  render(): JSX.Element {
    const envs = this._envs.map(value => { return {label: value, value}; });
    const pkgs = this._pkgs.map(value => { return {label: value, value}; });

    return (
      <>
        <label>Env:</label>
        <HTMLSelect
          className="jp-LogConsole-toolbarLogLevelDropdown"
          onChange={this.handleEnv}
          onKeyDown={this.handleKeyDown}
          value={this._selectedEnv}
          aria-label="Env"
          options={envs}
        />
        <label>Pkg:</label>
        <HTMLSelect
          className="jp-LogConsole-toolbarLogLevelDropdown"
          onChange={this.handlePkg}
          onKeyDown={this.handleKeyDown}
          value={this._selectedPkg}
          aria-label="Pkg"
          options={pkgs}
        />
      </>
    );
  }

  private _graph: PkgGraph;
  private _model: CondaEnvironments;
  private _pkgManager: Conda.IPackageManager;
  private _selectedEnv: string;
  private _selectedPkg: string;
  private _envs: string[];
  private _pkgs: string[];
}
import {
  MainAreaWidget,
  ReactWidget
} from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

import { HTMLSelect } from '@jupyterlab/ui-components';

import cytoscape from 'cytoscape';

import * as React from 'react';

import { CondaEnvironments } from '../services';
import { Conda } from '../tokens';

class Graph extends Widget {
  constructor(model: CondaEnvironments) {
    super();
    this._model = model;
    this._selected = '';
    this._pkgManager = this._model.getPackageManager();
    this._updatePackages();
  }

  update(): void {
    const layout = (): cytoscape.LayoutOptions => {
      const ns = new Set<string>();
      this._nodes.forEach((n: cytoscape.NodeDefinition) => {
        ns.add(n.data.name);
      });
      if (ns.size >= 50) {
        return {
          name: 'circle',
          nodeDimensionsIncludeLabels: true,
          padding: 5,
          spacingFactor: 0.1,
          avoidOverlap: true
        };
      }
      return {
        name: 'concentric',
        nodeDimensionsIncludeLabels: true,
        spacingFactor: 0.5,
        avoidOverlap: true
      };
    };

    this._cy = cytoscape({
      layout: layout(),
      container: this.node,
      elements: {
        nodes: this._nodes,
        edges: this._edges
      },
      style: [
        {
          selector: 'node',
          style: {
            width: 'label',
            shape: 'rectangle',
            content: 'data(name)',
            'padding-bottom': '10px',
            'text-valign': 'center',
            'background-color': '#81bc00',
            'background-opacity': 0.4,
            'border-width': 1,
            'border-color': 'black'
          }
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle'
          }
        }
      ]
    });
  }

  public setEnv(env: string): void {
    this._selected = env;
    this._updatePackages();
  }

  private async _updatePackages(): Promise<void> {
    const available = await this._pkgManager.refresh(true, this._selected);
    
    this._nodes = [];
    this._edges = [];
    let anterior = "";
    
    available.forEach( (pkg: Conda.IPackage) => {
      if (pkg.version_installed) {
        console.debug(pkg);
        this._nodes.push({ data: { id: pkg.name, name:pkg.name } });
        if (anterior !== "") {
          this._edges.push({
            data: {
              source: pkg.name,
              target: anterior
            },
            style: {
              'line-style': 'solid',
              'line-color': '#F5A636'
            },
            classes: 'top-center'
          });
        }
        
        anterior = pkg.name;
      }
    });
    
    this.update();
  }

  protected onResize(): void {
    if (this._cy) {
      this._cy.resize();
      this._cy.fit();
    }
  }

  private _model: CondaEnvironments;
  private _pkgManager: Conda.IPackageManager;
  private _cy: cytoscape.Core;
  private _selected: string;
  private _nodes: Array<cytoscape.NodeDefinition> = [];
  private _edges: Array<cytoscape.EdgeDefinition> = [];
}

export class GraphContainer extends MainAreaWidget<Graph> {
  constructor(model: CondaEnvironments) {
    super({ content: new Graph(model) });
    this.toolbar.addItem('envs', new EnvSwitcher(this.content, model));
  }
}

class EnvSwitcher extends ReactWidget {
  constructor(graph: Graph, model: CondaEnvironments) {
    super();
    this.addClass('jp-LogConsole-toolbarLogLevel');
    this._graph = graph;
    this._model = model;
    this._selected = '';
    this._envs = [];

    this._model.environments
    .then( (envs: Conda.IEnvironment[]) => {
      envs.forEach( (env: Conda.IEnvironment) => {
        this._envs.push(env.name);
        if (env.is_default) this._selected = env.name;
      });

      this.update();
    });
  }

  private handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    this._selected = event.target.value;
    this._graph.setEnv(this._selected);
    this.update();
  };

  private handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.keyCode === 13) this._graph.update();
  };

  render(): JSX.Element {
    const envs = this._envs.map(value => { return {label: value, value}; });

    return (
      <>
        <label>Env:</label>
        <HTMLSelect
          className="jp-LogConsole-toolbarLogLevelDropdown"
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          value={this._selected}
          aria-label="Env"
          options={envs}
        />
      </>
    );
  }

  private _graph: Graph;
  private _model: CondaEnvironments;
  private _selected: string;
  private _envs: string[];
}
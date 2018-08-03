import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Title, Widget } from '@phosphor/widgets';
import { Token } from '@phosphor/coreutils';

import { CondaEnv } from './components/CondaEnv';

export const condaEnvId = 'jupyterlab_nb_conda:plugin';

export const ICondaEnv = new Token<ICondaEnv>('jupyterlab_nb_conda:ICondaEnv');

/* Whitelist of environment to show in the conda package manager. If the list contains
 * only one entry, the environment list won't be shown.
 */
export interface ICondaEnv {
  whitelist: Set<string>
}

export class CondaEnvWidget extends VDomRenderer<VDomModel> implements ICondaEnv {
  height: number;
  width: number;
  id: string;
  isAttached: boolean;
  title: Title<Widget>;
  reactComponent: React.ReactElement<any>;
  whitelist: Set<string>;

  constructor(
    height: number, 
    width: number
  ) {
    super();    
    this.id = condaEnvId;
    this.title.label = 'Conda Packages Manager';
    this.title.closable = true;

    this.height = height;
    this.width = width;
    this.whitelist = new Set();
  }

  protected onUpdateRequest(): void {
    this.reactComponent = (
      <CondaEnv
        height={this.height}
        width={this.width}
      /> );
    ReactDOM.render(
      this.reactComponent,
      document.getElementById(this.id)
    );
    this.render();
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    this.height = msg.height;
    this.width = msg.width;
    super.update();
  }

  render() {
    return this.reactComponent;
  }
};
import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Title, Widget } from '@phosphor/widgets';

import { CondaEnv } from './components/CondaEnv';
import { EnvironmentsModel } from './models';

export const condaEnvId = 'jupyterlab_nb_conda:plugin';

export class CondaEnvWidget extends VDomRenderer<VDomModel> {
  height: number;
  width: number;
  id: string;
  isAttached: boolean;
  title: Title<Widget>;
  reactComponent: React.ReactElement<any>;
  envModel: EnvironmentsModel;

  constructor(
    height: number, 
    width: number,
    envModel: EnvironmentsModel
  ) {
    super();    
    this.id = condaEnvId;
    this.title.label = 'Conda Packages Manager';
    this.title.closable = true;

    this.height = height;
    this.width = width;
    this.envModel = envModel;
  }

  protected onUpdateRequest(): void {
    this.reactComponent = (
    <CondaEnv 
      height={this.height}
      width={this.width}
      model={this.envModel} 
    />);
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
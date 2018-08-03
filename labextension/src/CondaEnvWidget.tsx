import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Title, Widget } from '@phosphor/widgets';

export default class CondaEnvWidget extends VDomRenderer<VDomModel> {
  height: number;
  width: number;
  id: string;
  isAttached: boolean;
  title: Title<Widget>;
  reactComponent: React.ReactElement<any>;

  constructor(
    height: number, 
    width: number
  ) {
    super();
    this.height = height;
    this.width = width;
  }

  protected onUpdateRequest(): void {
    // this.reactComponent = (
    //   <ShortcutUI
    //     height={this.height}
    //     width={this.width}
    //   /> );
    ReactDOM.render(
      // this.reactComponent, 
      <h1>Hello</h1>,
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
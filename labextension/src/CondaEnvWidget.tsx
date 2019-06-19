import { VDomRenderer, VDomModel } from "@jupyterlab/apputils";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Title, Widget } from "@phosphor/widgets";

import { NbConda } from "./components/NbConda";
import { IEnvironmentManager } from "./services";
import { Message } from "@phosphor/messaging";

export const condaEnvId = "jupyterlab_conda:plugin";

/**
 * Phosphor Widget encapsulating the Conda Environments & Packages Manager
 */
export class CondaEnvWidget extends VDomRenderer<VDomModel> {
  /**
   * Widget height
   */
  height: number;
  /**
   * Widget width
   */
  width: number;
  /**
   * Widget id
   */
  id: string;
  /**
   * Is the widget attached to a shell
   */
  isAttached: boolean;
  /**
   * Widget title
   */
  title: Title<Widget>;
  /**
   * Child React component
   */
  reactComponent: React.ReactElement<any>;
  /**
   * Conda environment Manager
   */
  envModel: IEnvironmentManager;

  constructor(height: number, width: number, envModel: IEnvironmentManager) {
    super();

    this.height = height;
    this.width = width;
    this.envModel = envModel;
  }

  /**
   * Handle activate requests for the widget.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Dispose of the IFrame when closing
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  protected onUpdateRequest(): void {
    this.reactComponent = (
      <NbConda height={this.height} width={this.width} model={this.envModel} />
    );
    ReactDOM.render(this.reactComponent, document.getElementById(this.id));
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
}

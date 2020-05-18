import { ReactWidget } from "@jupyterlab/apputils";
import { Widget } from "@lumino/widgets";
import * as React from "react";

import { NbConda } from "./components/NbConda";
import { IEnvironmentManager } from "./tokens";

export const condaEnvId = "jupyterlab_conda:plugin";

/**
 * Phosphor Widget encapsulating the Conda Environments & Packages Manager
 */
export class CondaEnvWidget extends ReactWidget {
  /**
   * Widget height
   */
  private height: number;
  /**
   * Widget width
   */
  private width: number;
  /**
   * Conda environment Manager
   */
  private envModel: IEnvironmentManager;

  constructor(height: number, width: number, envModel: IEnvironmentManager) {
    super();

    this.height = height;
    this.width = width;
    this.envModel = envModel;
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    this.height = msg.height;
    this.width = msg.width;
    super.onResize(msg);
  }

  render(): JSX.Element {
    return (
      <NbConda height={this.height} width={this.width} model={this.envModel} />
    );
  }
}

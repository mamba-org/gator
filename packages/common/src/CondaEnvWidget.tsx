import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { NbConda } from './components/NbConda';
import { IEnvironmentManager } from './tokens';

/**
 * Widget size interface
 */
interface ISize {
  /**
   * Widget heigth
   */
  height: number;
  /**
   * Widget width
   */
  width: number;
}

/**
 * Widget encapsulating the Conda Environments & Packages Manager
 */
export class CondaEnvWidget extends ReactWidget {
  constructor(envModel: IEnvironmentManager) {
    super();
    this._envModel = envModel;
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    const { height, width } = msg;
    this._resizeSignal.emit({ height, width });
    super.onResize(msg);
  }

  render(): JSX.Element {
    return (
      <UseSignal
        signal={this._resizeSignal}
        initialArgs={{ height: 0, width: 0 }}
      >
        {(_, size): JSX.Element => (
          <NbConda
            height={size.height}
            width={size.width}
            model={this._envModel}
          />
        )}
      </UseSignal>
    );
  }

  /**
   * Conda environment Manager
   */
  private _envModel: IEnvironmentManager;
  /**
   * Signal triggering a React rendering if widget is resized
   */
  private _resizeSignal = new Signal<CondaEnvWidget, ISize>(this);
}

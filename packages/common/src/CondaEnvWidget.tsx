import { ReactWidget, UseSignal } from './utils';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import './icon';
import { NbConda } from './components/NbConda';
import { IEnvironmentManager } from './tokens';
import { CommandRegistry } from '@lumino/commands';

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
  constructor(
    envModel: IEnvironmentManager,
    commands: CommandRegistry,
    envName?: string,
    useDirectPackageActions?: boolean
  ) {
    super();
    this._envModel = envModel;
    this._commands = commands;
    this._envName = envName;
    this._useDirectPackageActions = useDirectPackageActions ?? true;
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
        {(_: any, size: ISize): JSX.Element => (
          <NbConda
            height={size.height}
            width={size.width}
            model={this._envModel}
            commands={this._commands}
            envName={this._envName}
            useDirectPackageActions={this._useDirectPackageActions}
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
  /**
   * Whether to use direct package actions (immediate update on version change)
   */
  private _useDirectPackageActions: boolean;
}

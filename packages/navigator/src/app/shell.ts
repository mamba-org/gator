import { JupyterFrontEnd } from '@jupyterlab/application';

import { classes, DockPanelSvg, LabIcon } from '@jupyterlab/ui-components';

import { Panel, Widget, BoxLayout } from '@lumino/widgets';

import { isJupyterLab4 } from '../plugins/top/utils';
let iter: ((obj: any) => IterableIterator<Widget>) | undefined;
let toArray: (<T>(obj: Iterable<T>) => T[]) | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lumino = require('@lumino/algorithm');
  iter = lumino.iter;
  toArray = lumino.toArray;
} catch {
  // No-op: running in Lumino 2 where `iter` no longer exists
}

export type IGatorShell = GatorShell;

/**
 * A namespace for Shell statics
 */
export namespace IGatorShell {
  /**
   * The areas of the application shell where widgets can reside.
   */
  export type Area = 'main' | 'top';
}

/**
 * The application shell.
 */
export class GatorShell extends Widget implements JupyterFrontEnd.IShell {
  constructor() {
    super();
    this.id = 'main';

    const rootLayout = new BoxLayout();

    this._top = new Panel();
    this._main = new DockPanelSvg();

    this._top.id = 'top-panel';
    this._main.id = 'main-panel';

    BoxLayout.setStretch(this._top, 0);
    BoxLayout.setStretch(this._main, 1);

    this._main.spacing = 5;

    rootLayout.spacing = 0;
    rootLayout.addWidget(this._top);
    rootLayout.addWidget(this._main);

    this.layout = rootLayout;
  }

  activateById(id: string): void {
    // no-op
  }

  /**
   * Add a widget to the application shell.
   *
   * @param widget - The widget being added.
   *
   * @param area - Optional region in the shell into which the widget should
   * be added.
   *
   */
  add(widget: Widget, area?: IGatorShell.Area): void {
    if (area === 'top') {
      return this._top.addWidget(widget);
    }
    return this._addToMainArea(widget);
  }

  /**
   * The current widget in the shell's main area.
   */
  get currentWidget(): Widget {
    if (isJupyterLab4()) {
      return this._main.widgets().next().value;
    }

    return toArray(this._main.widgets())[0];
  }

  widgets(area: IGatorShell.Area): IterableIterator<Widget> {
    if (area === 'top') {
      const top = this._top.widgets;
      if (iter) {
        // Lumino 1
        return iter(top) as unknown as IterableIterator<Widget>;
      }
      // Lumino 2
      return top[Symbol.iterator]();
    }

    // `this._main.widgets()` is already an IterableIterator in Lumino 2
    return this._main.widgets();
  }

  /**
   * Add a widget to the main content area.
   *
   * @param widget The widget to add.
   */
  private _addToMainArea(widget: Widget): void {
    if (!widget.id) {
      console.error('Widgets added to app shell must have unique id property.');
      return;
    }

    const dock = this._main;

    const { title } = widget;
    title.dataset = { ...title.dataset, id: widget.id };

    if (title.icon instanceof LabIcon) {
      // bind an appropriate style to the icon
      title.icon = title.icon.bindprops({
        stylesheet: 'mainAreaTab'
      });
    } else if (typeof title.icon === 'string' || !title.icon) {
      // add some classes to help with displaying css background imgs
      title.iconClass = classes(title.iconClass, 'jp-Icon');
    }

    dock.addWidget(widget, { mode: 'tab-after' });
    dock.activateWidget(widget);
  }

  private _main: DockPanelSvg;
  private _top: Panel;
}

import { JupyterFrontEnd } from '@jupyterlab/application';

import { classes, DockPanelSvg, LabIcon } from '@jupyterlab/ui-components';

import { IIterator, iter, toArray } from '@lumino/algorithm';

import { Panel, Widget, BoxLayout } from '@lumino/widgets';

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
    // TODO: use a focus tracker to return the current widget
    return toArray(this._main.widgets())[0];
  }

  widgets(area: IGatorShell.Area): IIterator<Widget> {
    if (area === 'top') {
      return iter(this._top.widgets);
    }
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

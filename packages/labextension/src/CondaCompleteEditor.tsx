import { Widget } from '@lumino/widgets';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget
} from '@jupyterlab/docregistry';
import {
  IWidgetTracker,
  ReactWidget,
  WidgetTracker,
  addToolbarButtonClass,
  ToolbarButtonComponent,
  Toolbar
} from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { condaIcon, IEnvironmentManager } from '@mamba-org/gator-common';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  CondaEnvSolve,
  solveAndCreateEnvironment
} from '@mamba-org/gator-common/lib/components/CondaEnvSolve';
import { Signal } from '@lumino/signaling';
import { runIcon, saveIcon } from '@jupyterlab/ui-components';

class CondaCompleteWidget extends Widget {
  constructor(
    environmentManager: IEnvironmentManager,
    readonly context: DocumentRegistry.Context
  ) {
    super();

    const subdirPromise = environmentManager.subdir();

    (async () => {
      await context.ready;
      const { subdir } = await subdirPromise;

      const renderCondaEnvSolve = () => {
        ReactDOM.render(
          <CondaEnvSolve
            subdir={subdir}
            quetzUrl={environmentManager.quetzUrl}
            quetzSolverUrl={environmentManager.quetzSolverUrl}
            content={context.model.toString()}
            expandChannelUrl={true}
            onContentChange={(content: string) => {
              if (content !== context.model.toString()) {
                context.model.fromString(content);
                context.model.dirty = true;
              }
            }}
          />,
          this.node
        );
      };

      renderCondaEnvSolve();
      context.model.contentChanged.connect(renderCondaEnvSolve);
    })();
  }

  dispose(): void {
    Signal.clearData(this);
    super.dispose();
  }
}

class CondaCompleteFactory extends ABCWidgetFactory<
  DocumentWidget<CondaCompleteWidget>
> {
  constructor(
    readonly options: CondaCompleteFactory.ICondaCompleteFactoryOptions
  ) {
    super(options);
  }

  protected defaultToolbarFactory(
    widget: CondaCompleteWidget
  ): DocumentRegistry.IToolbarItem[] {
    const { quetzUrl, quetzSolverUrl } = this.options.environmentManager;
    return [
      {
        name: 'save',
        widget: addToolbarButtonClass(
          ReactWidget.create(
            <ToolbarButtonComponent
              icon={saveIcon}
              onClick={() => {
                console.log('save', widget.context.save);
                widget.context.save();
              }}
              tooltip={'Save'}
            />
          )
        )
      },
      {
        name: 'create',
        widget: addToolbarButtonClass(
          ReactWidget.create(
            <ToolbarButtonComponent
              icon={runIcon}
              onClick={() =>
                solveAndCreateEnvironment(
                  widget.context.model.toString(),
                  this.options.environmentManager,
                  false
                )
              }
              tooltip={'Create new environment'}
            />
          )
        )
      },
      {
        name: 'spacer',
        widget: Toolbar.createSpacerItem()
      },
      {
        name: 'settings',
        widget: ReactWidget.create(
          <span className="condaCompleteSettings">
            <span>
              <b>quetzUrl:</b> {quetzUrl}
            </span>
            {quetzSolverUrl && (
              <span>
                <b>quetzSolverUrl:</b> {quetzSolverUrl}
              </span>
            )}
          </span>
        )
      }
    ];
  }

  protected createNewWidget(
    context: DocumentRegistry.Context
  ): DocumentWidget<CondaCompleteWidget> {
    return new DocumentWidget<CondaCompleteWidget>({
      context,
      content: new CondaCompleteWidget(this.options.environmentManager, context)
    });
  }
}

export namespace CondaCompleteFactory {
  export interface ICondaCompleteFactoryOptions
    extends DocumentRegistry.IWidgetFactoryOptions {
    environmentManager: IEnvironmentManager;
  }
}

const FACTORY = 'conda';

type ICondaCompleteTracker = IWidgetTracker<DocumentWidget>;

export const ICondaCompleteTracker = new Token<ICondaCompleteTracker>(
  'condacomplete/tracker'
);

export const condaCompleteExtension: JupyterFrontEndPlugin<ICondaCompleteTracker> = {
  id: '@mamba-org/gator-lab:conda-completer',
  autoStart: true,
  requires: [ILayoutRestorer, IEnvironmentManager],
  provides: ICondaCompleteTracker,
  activate
};

function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  environmentManager: IEnvironmentManager
): ICondaCompleteTracker {
  const namespace = 'conda';
  const tracker = new WidgetTracker<DocumentWidget>({ namespace });

  if (!environmentManager.quetzUrl) {
    return tracker;
  }

  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  const factory = new CondaCompleteFactory({
    name: FACTORY,
    fileTypes: ['yaml', 'conda.yml', 'conda'],
    defaultFor: ['conda.yml', 'conda'],
    environmentManager
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = condaIcon;

    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });
    tracker.add(widget);
  });
  app.docRegistry.addWidgetFactory(factory);

  app.docRegistry.addFileType({
    name: FACTORY,
    displayName: 'Environment file',
    mimeTypes: ['application/conda'],
    extensions: ['.yml', '.conda.yml'],
    icon: condaIcon,
    fileFormat: 'text',
    contentType: 'file'
  });

  return tracker;
}

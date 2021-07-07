import * as React from 'react';
import CodeMirror, { Editor } from 'codemirror';
import 'codemirror/lib/codemirror.css';
import './yaml';
import * as condaHint from './CondaHint';
import { IEnvironmentManager } from '../tokens';
import { INotification } from 'jupyterlab_toastify';

/**
 * Conda solve properties
 */
export interface ICondaEnvSolveProps {
  /**
   *  The URL of the Quetz server
   */
  quetzUrl: string;
  /**
   *  The URL of the Quetz server with the solver plugin, if different from quetzUrl
   */
  quetzSolverUrl: string;
  /**
   * The Conda subdir (or platform e.g. osx-64, linux-32) of the backend
   */
  subdir: string;
  /**
   * The initial content of the editors text area
   */
  content?: string;
  /**
   * Should the channel name be expanded to the channel URL in the editors text area
   */
  expandChannelUrl?: boolean;
  /**
   *  Callback to get notified of changes to the editors text area
   */
  onContentChange?(content: string): void;
}

export function CondaEnvSolve(props: ICondaEnvSolveProps): JSX.Element {
  condaHint.register(props.quetzUrl, props.expandChannelUrl);
  const codemirrorElem = React.useRef(null);

  const [editor, setEditor] = React.useState(null);

  React.useEffect(() => {
    if (editor) {
      if (props.content !== undefined && props.content !== editor.getValue()) {
        editor.setValue(props.content);
        editor.refresh();
      }
      return;
    }
    const newEditor = CodeMirror(codemirrorElem.current, {
      value: props.content || '',
      lineNumbers: true,
      extraKeys: {
        'Ctrl-Space': 'autocomplete',
        'Ctrl-Tab': 'autocomplete'
      },
      tabSize: 2,
      mode: 'yaml',
      autofocus: true
    });
    if (props.onContentChange) {
      newEditor.on('change', (instance: Editor) =>
        props.onContentChange(instance.getValue())
      );
    }
    setEditor(newEditor);

    /* Apply lab styles to this codemirror instance */
    codemirrorElem.current.childNodes[0].classList.add('cm-s-jupyter');
  });
  return (
    <div
      ref={codemirrorElem}
      className="conda-complete-panel"
      onMouseEnter={() => editor && editor.refresh()}
    />
  );
}

/**
 * Solve the environment provided in environment_yml on the Quetz server and create it on the
 * backend.
 *
 * @param environment_yml - The environment.yml content
 * @param environmentManager - The Conda environment manager
 * @param expandChannelUrl - The environment_yml contains channel names that should be expanded to
 *  channel URLS
 * @param onMessage - Callback to provide feedback about the process
 */
export async function solveAndCreateEnvironment(
  environment_yml: string,
  environmentManager: IEnvironmentManager,
  expandChannelUrl: boolean,
  onMessage?: (msg: string) => void
): Promise<void> {
  const name = condaHint.getName(environment_yml);
  const { quetzUrl, quetzSolverUrl, subdir } = environmentManager;

  let message = 'Solving environment...';
  onMessage && onMessage(message);
  let toastId = await INotification.inProgress(message);
  try {
    const explicitList = await condaHint.fetchSolve(
      quetzUrl,
      quetzSolverUrl,
      (await subdir()).subdir,
      environment_yml,
      expandChannelUrl
    );
    await INotification.update({
      toastId,
      message: 'Environment has been solved.',
      type: 'success',
      autoClose: 5000
    });

    message = `creating environment ${name}...`;
    onMessage && onMessage(message);
    toastId = await INotification.inProgress(message);
    await environmentManager.import(name, explicitList);

    message = `Environment ${name} created.`;
    onMessage && onMessage(message);
    await INotification.update({
      toastId,
      message,
      type: 'success',
      autoClose: 5000
    });
  } catch (error) {
    onMessage && onMessage(error.message);
    if (toastId) {
      await INotification.update({
        toastId,
        message: error.message,
        type: 'error',
        autoClose: 0
      });
    }
  }
}

export interface ICondaEnvSolveDialogProps {
  /**
   * The Conda subdir (or platform e.g. osx-64, linux-32) of the backend
   */
  subdir: string;
  /**
   * The Conda environment manager
   */
  environmentManager: IEnvironmentManager;
}

export function CondaEnvSolveDialog(
  props: ICondaEnvSolveDialogProps
): JSX.Element {
  const [environment_yml, setEnvironment_yml] = React.useState('');
  const [solveState, setSolveState] = React.useState(null);

  return (
    <div className="condaCompleteDialog__panel">
      <div style={{ flexGrow: 1 }}>
        <CondaEnvSolve
          expandChannelUrl={false}
          subdir={props.subdir}
          quetzUrl={props.environmentManager.quetzUrl}
          quetzSolverUrl={props.environmentManager.quetzSolverUrl}
          onContentChange={setEnvironment_yml}
        />
      </div>
      <div style={{ padding: '12px' }}>
        <button
          onClick={() =>
            solveAndCreateEnvironment(
              environment_yml,
              props.environmentManager,
              true,
              setSolveState
            )
          }
          className="jp-Dialog-button jp-mod-accept jp-mod-styled"
        >
          Create
        </button>
        <span style={{ marginLeft: '12px' }}>{solveState}</span>
      </div>
    </div>
  );
}

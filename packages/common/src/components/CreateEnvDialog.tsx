import { Dialog, ReactWidget } from '@jupyterlab/apputils';
import { fileUploadIcon, editIcon } from '@jupyterlab/ui-components';
import * as React from 'react';

/** dialog return options */
export type CreateChoice = 'import' | 'manual' | 'cancel';

class CreateEnvironment extends React.PureComponent<{
  onChoose: (c: Exclude<CreateChoice, 'cancel'>) => void;
}> {
  private importButtonRef = React.createRef<HTMLButtonElement>();
  private globalKeyHandler?: (event: KeyboardEvent) => void;
  private handleKeyDown = (
    event: React.KeyboardEvent,
    choice: Exclude<CreateChoice, 'cancel'>
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.props.onChoose(choice);
    }
  };

  componentDidMount() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (this.importButtonRef.current) {
          this.importButtonRef.current.focus();
        }
      }, 50);
    });

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const dialogElement = document.querySelector('.jp-NbConda-CreateDialog');
      if (!dialogElement) {
        return;
      }

      if (!dialogElement.contains(event.target as Node)) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target && target.classList.contains('gator-OptionCard')) {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          if (target.getAttribute('aria-label')?.includes('Import')) {
            this.props.onChoose('import');
          } else if (target.getAttribute('aria-label')?.includes('Create')) {
            this.props.onChoose('manual');
          }
        }
        return;
      }

      if (event.key === 'Enter' && event.target === document.activeElement) {
        const activeElement = document.activeElement as HTMLElement;
        if (
          activeElement &&
          activeElement.classList.contains('gator-OptionCard')
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (activeElement.getAttribute('aria-label')?.includes('Import')) {
            this.props.onChoose('import');
          } else if (
            activeElement.getAttribute('aria-label')?.includes('Create')
          ) {
            this.props.onChoose('manual');
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);

    (this as any)._globalKeyHandler = handleGlobalKeyDown;
  }

  componentWillUnmount() {
    if ((this as any)._globalKeyHandler) {
      document.removeEventListener(
        'keydown',
        (this as any)._globalKeyHandler,
        true
      );
    }
  }
  render() {
    return (
      <div className="gator-CreateDialogBody">
        <div className="gator-OptionGrid gator-TwoOptions">
          <button
            ref={this.importButtonRef}
            className="gator-OptionCard"
            onClick={() => this.props.onChoose('import')}
            onKeyDown={e => this.handleKeyDown(e, 'import')}
            tabIndex={0}
            type="button"
            aria-label="Import environment from file"
            data-choice="import"
          >
            <div className="gator-OptionIcon">
              <fileUploadIcon.react tag="span" />
            </div>
            <div className="gator-OptionText">Import</div>
          </button>

          <button
            className="gator-OptionCard"
            onClick={() => this.props.onChoose('manual')}
            onKeyDown={e => this.handleKeyDown(e, 'manual')}
            tabIndex={0}
            type="button"
            aria-label="Create environment manually"
            data-choice="manual"
          >
            <div className="gator-OptionIcon">
              <editIcon.react tag="span" />
            </div>
            <div className="gator-OptionText">Create Manually</div>
          </button>
        </div>
      </div>
    );
  }
}

/** Controller: opens the dialog and returns the user's choice */
export async function openCreateEnvDialog(): Promise<CreateChoice> {
  let settled = false;
  const settle = (choice: CreateChoice, dialog: Dialog<any>) => {
    if (settled) {
      return;
    }
    settled = true;
    try {
      dialog.dispose();
    } finally {
      resolve(choice);
    }
  };

  let resolve!: (choiceStr: CreateChoice) => void;
  const choicePromise = new Promise<CreateChoice>(r => (resolve = r));

  // eslint-disable-next-line prefer-const
  let dialog: Dialog<any>;

  const body = ReactWidget.create(
    <CreateEnvironment onChoose={choice => settle(choice, dialog)} />
  );

  dialog = new Dialog({
    title: 'Create Environment',
    body,
    buttons: [Dialog.cancelButton({ label: 'Cancel' })]
  });

  dialog.addClass('jp-NbConda-CreateDialog');

  void dialog
    .launch()
    .then(() => settle('cancel', dialog))
    .catch(() => settle('cancel', dialog));

  return choicePromise;
}

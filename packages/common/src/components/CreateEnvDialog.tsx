import { Dialog, ReactWidget } from '@jupyterlab/apputils';
import { fileUploadIcon, addIcon } from '@jupyterlab/ui-components'; // TODO: editIcon
import * as React from 'react';

/** dialog return options */
export type CreateChoice = 'import' | 'manual' | 'cancel';

class CreateEnvironment extends React.PureComponent<{
  onChoose: (c: Exclude<CreateChoice, 'cancel'>) => void;
}> {
  render() {
    return (
      <div className="gator-CreateDialogBody">
        <div className="gator-OptionGrid gator-TwoOptions">
          <button
            className="gator-OptionCard"
            onClick={() => this.props.onChoose('import')}
          >
            <div className="gator-OptionIcon">
              <fileUploadIcon.react tag="span" />
            </div>
            <div className="gator-OptionText">Import</div>
          </button>

          <button
            className="gator-OptionCard"
            onClick={() => this.props.onChoose('manual')}
          >
            <div className="gator-OptionIcon">
              <addIcon.react tag="span" />
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

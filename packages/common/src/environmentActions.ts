import { Dialog, Notification, showDialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { IEnvironmentManager } from './tokens';

export async function createEnvironment(
  model: IEnvironmentManager,
  name: string,
  type?: string
): Promise<void> {
  let toastId = '';

  try {
    toastId = Notification.emit(`Creating environment ${name}`, 'in-progress');

    await model.create(name, type);

    Notification.update({
      id: toastId,
      message: `Environment ${name} has been created.`,
      type: 'success',
      autoClose: 5000
    });

    // create calls model.refreshEnvs() already AND emits signal envAdded
  } catch (error) {
    if (error !== 'cancelled') {
      console.error(error);
      if (toastId) {
        Notification.update({
          id: toastId,
          message: (error as any).message,
          type: 'error',
          autoClose: false
        });
      } else {
        Notification.error((error as any).message);
      }
    } else {
      if (toastId) {
        Notification.dismiss(toastId);
      }
    }
  }
}

export async function cloneEnvironment(
  model: IEnvironmentManager,
  environmentName: string | undefined
): Promise<void> {
  let toastId = '';
  try {
    if (!environmentName) {
      return;
    }
    const body = document.createElement('div');
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name : ';
    const nameInput = document.createElement('input');
    body.appendChild(nameLabel);
    body.appendChild(nameInput);

    const response = await showDialog({
      title: 'Clone Environment',
      body: new Widget({ node: body }),
      buttons: [Dialog.cancelButton(), Dialog.okButton({ caption: 'Clone' })]
    });
    if (response.button.accept) {
      if (nameInput.value.length === 0) {
        throw new Error('An environment name should be provided.');
      }
      toastId = Notification.emit(
        `Cloning environment ${environmentName}`,
        'in-progress'
      );
      await model.clone(environmentName, nameInput.value);
      Notification.update({
        id: toastId,
        message: `Environment ${nameInput.value} created.`,
        type: 'success',
        autoClose: 5000
      });
    }
  } catch (error) {
    if (error !== 'cancelled') {
      console.error(error);
      if (toastId) {
        Notification.update({
          id: toastId,
          message: (error as any).message,
          type: 'error',
          autoClose: false
        });
      } else {
        Notification.error((error as any).message);
      }
    } else {
      if (toastId) {
        Notification.dismiss(toastId);
      }
    }
  }
}

export async function exportEnvironment(
  model: IEnvironmentManager,
  environmentName: string | undefined
): Promise<void> {
  try {
    if (!environmentName) {
      return;
    }
    const response = await model.export(environmentName);
    if (response.ok) {
      const content = await response.text();
      const node = document.createElement('div');
      const link = document.createElement('a');
      link.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
      );
      link.setAttribute('download', environmentName + '.yml');

      node.style.display = 'none'; // hide the element
      node.appendChild(link);
      document.body.appendChild(node);
      link.click();
      document.body.removeChild(node);
    }
  } catch (error) {
    if (error !== 'cancelled') {
      console.error(error);
      Notification.error((error as any).message);
    }
  }
}

export async function removeEnvironment(
  model: IEnvironmentManager,
  environmentName: string
): Promise<void> {
  let toastId = '';
  try {
    if (!environmentName) {
      return;
    }
    const response = await showDialog({
      title: 'Remove Environment',
      body: `Are you sure you want to permanently delete environment "${environmentName}" ?`,
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({
          caption: 'Delete',
          displayType: 'warn'
        })
      ]
    });
    if (response.button.accept) {
      toastId = Notification.emit(
        `Removing environment ${environmentName}`,
        'in-progress'
      );
      await model.remove(environmentName);
      Notification.update({
        id: toastId,
        message: `Environment ${environmentName} has been removed.`,
        type: 'success',
        autoClose: 5000
      });
    }
  } catch (error) {
    if (error !== 'cancelled') {
      console.error(error);
      if (toastId) {
        Notification.update({
          id: toastId,
          message: (error as any).message,
          type: 'error',
          autoClose: false
        });
      } else {
        Notification.error((error as any).message);
      }
    } else {
      if (toastId) {
        Notification.dismiss(toastId);
      }
    }
  }
}

async function _readFileAsText(file: Blob): Promise<string> {
  // Prefer the built-in Promise API when available
  if ((file as any).text) {
    return (file as any as File).text();
  }
  // Fallback for older environments
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file);
  });
}

export async function importEnvironment(
  model: IEnvironmentManager,
  environmentName: string
): Promise<void> {
  let toastId = '';
  try {
    const body = document.createElement('div');
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name : ';
    const nameInput = document.createElement('input');
    body.appendChild(nameLabel);
    body.appendChild(nameInput);

    const fileLabel = document.createElement('label');
    fileLabel.textContent = 'File : ';
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');

    body.appendChild(fileLabel);
    body.appendChild(fileInput);

    const response = await showDialog({
      title: 'Import Environment',
      body: new Widget({ node: body }),
      buttons: [Dialog.cancelButton(), Dialog.okButton()]
    });
    if (response.button.accept) {
      if (nameInput.value.length === 0) {
        throw new Error('A environment name should be provided.');
      }
      if ((fileInput.files?.length ?? 0) === 0) {
        throw new Error('A environment file should be selected.');
      }
      toastId = Notification.emit(
        `Import environment ${nameInput.value}`,
        'in-progress'
      );
      const selectedFile = fileInput.files![0];
      const file = await _readFileAsText(selectedFile);
      await model.import(nameInput.value, file, selectedFile.name);
      Notification.update({
        id: toastId,
        message: `Environment ${nameInput.value} created.`,
        type: 'success',
        autoClose: 5000
      });
    }
  } catch (error) {
    if (error !== 'cancelled') {
      console.error(error);
      if (toastId) {
        Notification.update({
          id: toastId,
          message: (error as any).message,
          type: 'error',
          autoClose: false
        });
      } else {
        Notification.error((error as any).message);
      }
    } else {
      if (toastId) {
        Notification.dismiss(toastId);
      }
    }
  }
}

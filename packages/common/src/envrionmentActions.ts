import { Dialog, Notification, showDialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { IEnvironmentManager } from './tokens';

export async function cloneEnvironment(
  model: IEnvironmentManager,
  environmentName: string | undefined,
  refresh?: () => void
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
        throw new Error('A environment name should be provided.');
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

      refresh?.();
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
  environmentName: string,
  refresh?: () => void
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
      model.emitEnvRemoved(environmentName);
      refresh?.();
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

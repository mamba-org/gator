import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Notification } from '@jupyterlab/apputils';
import { toast, ToastContainer, Id } from 'react-toastify';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

// Map JupyterLab notification types to react-toastify types
function getToastType(
  type: Notification.TypeOptions
): 'info' | 'success' | 'warning' | 'error' {
  switch (type) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

const toastIdMap = new Map<string, Id>();

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@mamba-org/navigator:notifications',
  autoStart: true,
  activate: (app: JupyterFrontEnd): void => {
    console.log('Notification bridge plugin activating...');

    const toastRoot = document.createElement('div');
    toastRoot.id = 'toast-root';
    document.body.appendChild(toastRoot);

    const root = ReactDOM.createRoot(toastRoot);
    root.render(
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
    );

    Notification.manager.changed.connect((_, change) => {
      const { type, notification } = change;
      const autoClose = notification.options.autoClose;

      // Show toast if autoClose is not 0, OR if it's an in-progress notification
      const shouldShow = autoClose !== 0 || notification.type === 'in-progress';

      if (type === 'added' && shouldShow) {
        const toastId = toast(notification.message, {
          type: getToastType(notification.type),
          autoClose:
            autoClose === false || autoClose === 0 ? false : autoClose || 5000,
          toastId: notification.id,
          isLoading: notification.type === 'in-progress'
        });
        toastIdMap.set(notification.id, toastId);
      } else if (type === 'updated') {
        const existingId = toastIdMap.get(notification.id);
        if (existingId !== undefined) {
          toast.update(existingId, {
            render: notification.message,
            type: getToastType(notification.type),
            autoClose:
              autoClose === false || autoClose === 0
                ? false
                : autoClose || 5000,
            isLoading: notification.type === 'in-progress'
          });
        } else if (shouldShow) {
          const toastId = toast(notification.message, {
            type: getToastType(notification.type),
            autoClose:
              autoClose === false || autoClose === 0
                ? false
                : autoClose || 5000,
            toastId: notification.id
          });
          toastIdMap.set(notification.id, toastId);
        }
      } else if (type === 'removed') {
        const existingId = toastIdMap.get(notification.id);
        if (existingId !== undefined) {
          toast.dismiss(existingId);
          toastIdMap.delete(notification.id);
        }
      }
    });

    console.log('Notification bridge activated!');
  }
};

export default plugin;

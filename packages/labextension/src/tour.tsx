import {
  CONDA_ENVIRONMENT_PANEL_ID,
  CONDA_ENVIRONMENT_TOOLBAR_CLASS,
  CONDA_PACKAGES_PANEL_ID,
  CONDA_PACKAGES_TOOLBAR_CLASS,
  CONDA_PACKAGE_SELECT_CLASS,
  CONDA_WIDGET_CLASS
} from '@mamba-org/gator-common';
import * as React from 'react';

export const managerTour = {
  id: 'jupyterlab-conda:tour',
  label: 'Conda Packages Manager Tour',
  hasHelpEntry: true,
  steps: [
    {
      content: (
        <p>
          Thanks for installing <em>Gator</em>.<br />
          Let&apos;s have a tour of the UI.
        </p>
      ),
      placement: 'center',
      target: `.${CONDA_WIDGET_CLASS}`,
      title: 'Conda Packages Manager'
    },
    {
      content: (
        <p>
          Your conda environment are listed here.
          <br />
          Click on it to manage its packages.
        </p>
      ),
      placement: 'right',
      target: `#${CONDA_ENVIRONMENT_PANEL_ID}`
    },
    {
      content: (
        <p>
          This toolbar contains environment actions like creation, deletion,
          exportation,...
        </p>
      ),
      placement: 'bottom',
      target: `.${CONDA_ENVIRONMENT_TOOLBAR_CLASS}`
    },
    {
      content: (
        <p>
          This table lists all available conda packages and their status within
          the selected environment (i.e. installed, updatable or available).
        </p>
      ),
      target: `#${CONDA_PACKAGES_PANEL_ID}`
    },
    {
      content: (
        <p>
          A package can be installed, removed or updated by selecting a status
          in these selectors.
        </p>
      ),
      placement: 'bottom',
      target: `.${CONDA_PACKAGE_SELECT_CLASS}`
    },
    {
      content: (
        <p>
          The package list can be filtered by packages status and with a search
          term.
        </p>
      ),
      placement: 'bottom-start',
      target: `.${CONDA_PACKAGES_TOOLBAR_CLASS}`
    },
    {
      content: <p>Execute package changes with the cart button.</p>,
      placement: 'bottom',
      target: `.${CONDA_PACKAGES_TOOLBAR_CLASS} .fa-cart-arrow-down`
    }
  ]
};

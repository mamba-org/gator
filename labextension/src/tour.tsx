import * as React from "react";
import {
  ENVIRONMENT_PANEL_ID,
  ENVIRONMENT_TOOLBAR_CLASS,
  PACKAGES_PANEL_ID,
  PACKAGES_TOOLBAR_CLASS,
  PACKAGE_SELECT_CLASS,
  WIDGET_CLASS
} from "./constants";

export const managerTour = {
  id: "jupyterlab-conda:tour",
  label: "Conda Packages Manager Tour",
  hasHelpEntry: true,
  steps: [
    {
      content: (
        <p>
          Thanks for installing <em>jupyter_conda</em>.<br />
          Let&apos;s have a tour of the UI.
        </p>
      ),
      placement: "center",
      target: `.${WIDGET_CLASS}`,
      title: "Conda Packages Manager"
    },
    {
      content: (
        <p>
          Your conda environment are listed here.
          <br />
          Click on it to manage its packages.
        </p>
      ),
      placement: "right",
      target: `#${ENVIRONMENT_PANEL_ID}`
    },
    {
      content: (
        <p>
          This toolbar contains environment actions like creation, deletion,
          exportation,...
        </p>
      ),
      placement: "bottom",
      target: `.${ENVIRONMENT_TOOLBAR_CLASS}`
    },
    {
      content: (
        <p>
          This table lists all available conda packages and their status within
          the selected environment (i.e. installed, updatable or available).
        </p>
      ),
      target: `#${PACKAGES_PANEL_ID}`
    },
    {
      content: (
        <p>
          A package can be installed, removed or updated by selecting a status
          in these selectors.
        </p>
      ),
      placement: "bottom",
      target: `.${PACKAGE_SELECT_CLASS}`
    },
    {
      content: (
        <p>
          The package list can be filtered by packages status and with a search
          term.
        </p>
      ),
      placement: "bottom-start",
      target: `.${PACKAGES_TOOLBAR_CLASS}`
    },
    {
      content: <p>Execute package changes with the cart button.</p>,
      placement: "bottom",
      target: `.${PACKAGES_TOOLBAR_CLASS} .fa-cart-arrow-down`
    }
  ]
};

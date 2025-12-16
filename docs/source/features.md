# Gator Features Documentation

## Overview

Gator (also known as Mamba Navigator) is a web-based user interface for managing conda and mamba environments and packages. It provides an intuitive graphical interface for environment and package management tasks that are typically performed via command-line tools. Gator is available both as a standalone application and as a JupyterLab extension.

### Purpose

Gator simplifies conda/mamba environment and package management by providing:

- Visual environment management without command-line knowledge
- Efficient package browsing, searching, and installation
- Batch operations for managing multiple packages simultaneously
- Integration with JupyterLab for seamless workflow

### Main Functionality

**Environment Management:**

- Create new environments from scratch or predefined templates
- Clone existing environments
- Import environments from YAML files
- Export environments to YAML files
- Remove environments
- Switch between environments

**Package Management:**

- Browse and search available packages
- Install packages with version selection
- Update installed packages
- Remove packages
- View package dependencies
- Filter packages by status (installed, updatable, available)
- Filter packages by channel

## Extension Settings

Gator provides several configurable settings accessible through the JupyterLab Settings menu:

### Background Caching

- **Purpose**: Controls whether package lists are cached in the background for improved performance
- **Default**: Enabled
- **Note**: First-time package list loading may take time, but subsequent loads are faster with caching enabled

### Kernel Companions

- **Purpose**: Define package dependencies that should be installed alongside kernel packages
- **Format**: JSON object mapping package names to semantic version specifications
- **Default**: Empty object

### Export from History

- **Purpose**: Controls whether environment exports use `--from-history` flag
- **Default**: Disabled
- **Note**: When enabled, exports only packages explicitly installed by the user

### Environment Types

- **Purpose**: Defines predefined environment templates available when creating new environments
- **Default**:
  - "Python 3": Includes `python=3` and `ipykernel`
  - "R": Includes `r-base` and `r-essentials`
- **Customization**: Users can add custom environment types with their own package lists

### Kernel Whitelist

- **Purpose**: Restricts environment list to only show environments corresponding to whitelisted kernels
- **Default**: Disabled (shows all environments)

### Direct Package Actions

- **Purpose**: Controls whether package version changes apply immediately or are batched
- **Default**: Enabled (direct mode)
- **Behavior**:
  - **Direct mode**: Selecting a package version immediately triggers install/update
  - **Batch mode**: Changes are queued and applied together via an "Apply" button

```{image} _static/images/visial-settings-editor.png
:alt: Screenshot showing the Conda extension settings panel
:align: center
```

## UI Components for Environment Actions

### Environment List Panel

The left sidebar displays all available conda/mamba environments. Each environment item shows:

- Environment name
- Visual indicator for the currently selected environment
- Context menu (kebab icon) for environment actions

```{image} _static/images/environment-list-kebab.png
:alt: Screenshot of the environment list panel showing multiple environments
:align: center
```

### Create Environment Button

Located at the top of the environment list, this button opens the environment creation workflow.

```{image} _static/images/create-env-button.png
:alt: Screenshot highlighting the "Create Environment" button
:align: center
```

### Create Environment Drawer

A full-screen modal interface for creating new environments with the following sections:

**Environment Details:**

- Environment name input field
- Environment type selector (e.g., "Python 3", "R", or custom types)
- Python version selector (when applicable)

**Package Selection:**

- Search bar for finding packages
- Package list with checkboxes and version selectors
- Sortable columns (name, version, channel)
- Side panel showing selected packages with ability to remove individual selections

**Actions:**

- Cancel button to close without creating
- Create button to finalize environment creation

```{image} _static/images/create-env-drawer.png
:alt: Screenshot of the Create Environment drawer showing the package selection interface
:align: center
```

### Environment Context Menu

Each environment item includes a context menu (accessible via kebab icon) with options:

- **Clone**: Create a copy of the environment with a new name
- **Export**: Export environment to a YAML file
- **Remove**: Delete the environment (disabled for base and default environments)

```{image} _static/images/env-context-menu.png
:alt: Screenshot of the environment context menu
:align: center
```

### Environment Creation Dialog

Initial dialog that appears when creating an environment, offering choices:

- **Import**: Import environment from a YAML file
- **Create Manually**: Open the full Create Environment drawer

```{image} _static/images/env-creation-dialog.png
:alt: Screenshot of the initial environment creation dialog
:align: center
```

## UI Components for Package Actions

### Package Panel

The main panel displays packages for the currently selected environment. It includes:

**Package Toolbar:**

- Search bar for filtering packages by name, description, keywords, or tags
- Filter button with badge showing active filter count
- "Add Packages" button to open the package installation drawer
- "Update All" button (enabled when updatable packages are available)
- Direct/Batch mode toggle button
- Selection count indicator (when packages are selected)
- Action buttons (Update, Remove, Clear) when in batch mode with selections

```{image} _static/images/package-toolbar.png
:alt: Screenshot of the package toolbar with various controls
:align: center
```

(direct-batch-toggle)=
### Direct/Batch Mode Toggle
**

The Direct/Batch mode toggle button in the package toolbar allows you to control how package changes are applied:

- **Direct Mode** (default): Package version changes apply immediately when selected
- **Batch Mode**: Queue multiple package changes and apply them all together with the "Apply" button

This toggle is essential for managing complex environment modifications efficiently.

```{image} _static/images/direct-batch-toggle.png
:alt: Screenshot of the package toolbar with the Direct/Batch toggle button circled in red
:align: center
```

### Package List

A scrollable, sortable table displaying packages with columns:

- **Name**: Package name with optional summary/description
- **Version**: Dropdown selector for choosing package version
- **Channel**: Source channel for the package
- **Status indicators**: Visual cues for installed, updatable, or available packages
- **Context menu**: Kebab icon for individual package actions (Update, Remove)

**Package Filters:**

- **Installed**: Shows only packages currently installed in the environment
- **Updatable**: Shows packages with available updates
- **Selected**: Shows packages with pending changes (batch mode)
- **Channel filters**: Filter by specific conda channels

```{image} _static/images/package-list.png
:alt: Screenshot of the package list showing installed packages with version selectors
:align: center
```

### Add Packages Drawer

A full-screen modal for browsing and installing multiple packages:

**Main Content Area:**

- Search bar for finding packages
- Package list with checkboxes and version selectors
- Intelligent search sorting (matches at start of name appear first)

**Selection Panel:**

- Side panel showing selected packages
- Ability to remove individual packages from selection
- Clear button to remove all selections

**Actions:**

- Cancel button to close without installing
- Install Selected button to install all selected packages

```{image} _static/images/add-packages-drawer.png
:alt: Screenshot of the Add Packages drawer with selected packages in the side panel
:align: center
```

### Package Context Menu

Individual packages have a context menu (accessible via kebab icon) with options:

- **Update**: Update the package to the latest version
- **Remove**: Uninstall the package from the environment

```{image} _static/images/pkg-context-menu.png
:alt: Screenshot of a package context menu
:align: center
```

### Filter Popover

A dropdown panel accessible via the filter button, providing:

- Status filter pills (Installed, Updatable, Selected)
- Channel checkboxes for filtering by channel
- Reset button to clear all filters
- Active filter count badge

```{image} _static/images/filter-popover.png
:alt: Screenshot of the filter popover showing status and channel options
:align: center
```

## Key Features Summary

### Workflow Modes

```{seealso}
See the {ref}`direct-batch-toggle` section for details on switching between modes.

**Direct Mode (Default):**

- Package version changes apply immediately
- Suitable for quick, single-package operations
- Selection count shows packages with pending updates

**Batch Mode:**

- Queue multiple package changes
- Apply all changes together with "Apply" button
- Useful for complex environment modifications

### Package Operations

- **Install**: Add new packages to environment
- **Update**: Upgrade packages to newer versions
- **Remove**: Uninstall packages from environment
- **Batch Operations**: Apply multiple changes simultaneously

### Environment Operations

- **Create**: New environment from scratch or template
- **Clone**: Duplicate existing environment
- **Import**: Create environment from YAML file
- **Export**: Save environment configuration to YAML
- **Remove**: Delete environment (with safeguards for base/default)

## Notes

```{note}
The first-time package list loading may take significant time as it builds the available packages cache. Package lists are cached and updated in the background for improved performance.
```

- Base and default environments are protected from removal
- Package dependency resolution is handled automatically by conda/mamba
- All operations provide user feedback through notifications and status indicators

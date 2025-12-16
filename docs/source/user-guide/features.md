# Gator Features

```{contents} On This Page
:depth: 2
:local:
```

## Core Capabilities

::::{grid} 1 1 2 2
:gutter: 3

:::{grid-item-card} 🌍 Environment Management

- ✨ Create from templates (Python 3, R, custom)
- 📋 Clone existing environments
- 📥 Import from YAML files
- 📤 Export to share across systems
- 🗑️ Remove (with protection for base/default)
  :::

:::{grid-item-card} 📦 Package Management

- 🔍 Search and filter thousands of packages
- 🎯 Pin specific versions
- 🔄 Update single or all packages
- 📊 View dependency graphs
- 🏷️ Filter by channel (conda-forge, defaults, etc.)
  :::

::::

## Power User Tips

```{dropdown} 💡 Speed Up Your Workflow
:open:

**Search Like a Pro**
- Use the package search bar for instant filtering
- Search works on package names
- Results sorted by relevance (matches at start of name appear first)

**Smart Filtering**
- Click the filter icon to access status filters
- Filter by channel to see only conda-forge packages
- Use "Updatable" filter to quickly find packages needing updates

**Batch Operations**
- Select multiple packages in batch mode
- Click "Update All" when you see the button enabled
- Use export/import to clone environments faster than manual copying
```

```{dropdown} 🎯 Pro Tips
**Performance**
- Enable background caching for faster startup
- First load builds cache—be patient!

**Organization**
- Use descriptive environment names (`project-ml-v2` not `env1`)
- Export environments regularly as backups
```

## Extension Settings

Gator provides several configurable settings accessible through **Settings** → **Settings Editor** → **Conda**:

```{image} ../_static/images/visual-settings-editor.png
:alt: Screenshot showing the Conda extension settings panel
:align: center
```

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

## UI Components for Environment Actions

### Environment List Panel

The left sidebar displays all available conda/mamba environments. Each environment item shows:

- Environment name
- Visual indicator for the currently selected environment
- Context menu (kebab icon) for environment actions

```{image} ../_static/images/environment-list-kebab.png
:alt: Screenshot of the environment list panel showing multiple environments
:align: center
```

### Create Environment Button

Located at the top of the environment list, this button opens the environment creation workflow.

```{image} ../_static/images/create-env-button.png
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
- Sortable columns (name, channel)
- Side panel showing selected packages with ability to remove individual selections

**Actions:**

- Cancel button to close without creating
- Create button to finalize environment creation

```{image} ../_static/images/create-env-drawer.png
:alt: Screenshot of the Create Environment drawer showing the package selection interface
:align: center
```

### Environment Context Menu

Each environment item includes a context menu (accessible via kebab icon) with options:

- **Clone**: Create a copy of the environment with a new name
- **Export**: Export environment to a YAML file
- **Remove**: Delete the environment (disabled for base and default environments)

```{image} ../_static/images/env-context-menu.png
:alt: Screenshot of the environment context menu
:align: center
```

### Environment Creation Dialog

Initial dialog that appears when creating an environment, offering choices:

- **Import**: Import environment from a YAML file
- **Create Manually**: Open the full Create Environment drawer

```{image} ../_static/images/env-creation-dialog.png
:alt: Screenshot of the initial environment creation dialog
:align: center
```

(import-export-environments)=

## Import and Export Environments

Gator allows you to share environment configurations across systems using YAML files.

### Exporting an Environment

Export an environment to save its package configuration:

1. Click the kebab menu (⋮) next to the environment name
2. Select **Export**
3. The environment YAML file will be downloaded to your default downloads folder

```{admonition} Export Options
:class: tip

The export behavior depends on your extension settings:

| Setting | Behavior | Use When |
|---------|----------|----------|
| **Export from History: Disabled** (default) | Exports all packages including dependencies | You want a complete snapshot |
| **Export from History: Enabled** | Exports only explicitly installed packages | You want a minimal, reproducible spec |
```

**Example exported YAML:**

```yaml
name: myenv
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.11
  - numpy=1.24
  - pandas=2.0
  - ipykernel
```

### Importing an Environment

Create a new environment from an exported YAML file:

1. Click the **Create Environment** button
2. Select **Import** in the dialog
3. Click **Choose File** and select your YAML file
4. Review the environment name and packages
5. Click **Import** to create the environment

```{note}
The environment name from the YAML file will be used. If an environment with that name already exists, you'll be prompted to choose a different name.
```

### Common Use Cases

::::{tab-set}

:::{tab-item} 🤝 Team Collaboration
Share your environment with teammates:

1. Export your working environment
2. Commit the YAML to git
3. Team imports to match your setup
4. Everyone has identical package versions!
   :::

:::{tab-item} 💾 Backup & Recovery
Before major changes:

1. Export current environment
2. Make experimental changes
3. If something breaks → import the backup
4. Back to working state instantly!
   :::

:::{tab-item} 🖥️ Multi-Machine Setup
Sync across your computers:

1. Export from laptop
2. Transfer YAML file
3. Import on desktop
4. Same environment everywhere!

```{warning}
Some packages are platform-specific. Consider separate YAML files for Linux/macOS/Windows.
```

:::

:::{tab-item} 📚 Reproducible Research
For publications and reports:

1. Enable "Export from History" in settings
2. Export minimal environment spec
3. Archive with your code/paper
4. Others can reproduce your exact setup
   :::

:::::

## UI Components for Package Actions

### Package Panel

The main panel displays packages for the currently selected environment. It includes:

**Package Toolbar:**

- Search bar for filtering packages by name
- Filter button with badge showing active filter count
- "Add Packages" button to open the package installation drawer
- "Update All" button (enabled when updatable packages are available)
- Direct/Batch mode toggle button
- Selection count indicator (when packages are selected)
- Action buttons (Update, Remove, Clear) when in batch mode with selections

```{image} ../_static/images/package-toolbar.png
:alt: Screenshot of the package toolbar with various controls
:align: center
```

(direct-batch-toggle)=

### Direct/Batch Mode Toggle

```{important}
**Choose Your Workflow!**

The mode toggle button controls how Gator handles package operations. Pick the right mode for your task.
```

```{image} ../_static/images/direct-batch-toggle.png
:alt: Screenshot of the package toolbar with the Direct/Batch toggle button circled in red
:align: center
```

::::{grid} 2
:gutter: 3

:::{grid-item-card} ⚡ Direct Mode (Default)
:class-card: sd-border-success

**When to use:**

- Quick single-package updates
- Trying out package versions
- Exploratory work

**How it works:**
Changes apply immediately when you select a version

💡 **Pro tip:** Great for rapid testing!
:::

:::{grid-item-card} 📦 Batch Mode
:class-card: sd-border-info

**When to use:**

- Multiple related changes
- Complex environment setup
- Want to review before applying

**How it works:**
Queue multiple changes, click "Apply" to execute all at once

💡 **Pro tip:** Safer for production environments!
:::

::::

### Package List

A scrollable, sortable table displaying packages with columns:

- **Name**: Package name with optional summary/description
- **Version**: Dropdown selector for choosing package version
- **Channel**: Source channel for the package
- **Status indicators**: Visual cues for updatable packages
- **Context menu**: Kebab icon for individual package actions (Update, Remove)

**Package Filters:**

- **Installed**: Shows only packages currently installed in the environment
- **Updatable**: Shows packages with available updates
- **Selected**: Shows packages with pending changes (batch mode)
- **Channel filters**: Filter by specific conda channels

```{image} ../_static/images/package-list.png
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

```{image} ../_static/images/add-packages-drawer.png
:alt: Screenshot of the Add Packages drawer with selected packages in the side panel
:align: center
```

### Package Dependencies Graph

A dialog that displays the dependency graph for a selected package, showing:

- Package dependencies
- Dependent packages
- Visual representation of relationships

```{image} ../_static/images/package-dependencies.png
:alt: Screenshot of a package dependencies graph dialog
:align: center
```

### Package Context Menu

Individual packages have a context menu (accessible via kebab icon) with options:

- **Update**: Update the package to the latest version
- **Remove**: Uninstall the package from the environment

```{image} ../_static/images/pkg-context-menu.png
:alt: Screenshot of a package context menu
:align: center
```

### Filter Popover

A dropdown panel accessible via the filter button, providing:

- Status filter pills (Installed, Updatable, Selected)
- Channel checkboxes for filtering by channel
- Reset button to clear all filters
- Active filter count badge

```{image} ../_static/images/filter-popover.png
:alt: Screenshot of the filter popover showing status and channel options
:align: center
```

## Key Features Summary

### Workflow Modes

:::{seealso}
See the {ref}`direct-batch-toggle` section for details on switching between modes.
:::

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

## Troubleshooting

`````{dropdown} 🐛 Common Issues & Solutions

````{tab-set}

```{tab-item} Slow Loading
**Problem:** Package list takes forever to load

**Solutions:**
- ✅ First load builds the cache—this is normal and only happens once
- ✅ Enable "Background Caching" in settings
- ✅ Close and reopen after first load to see cached performance
- ✅ Check your internet connection
```

```{tab-item} Can't Remove Environment
**Problem:** Remove option is disabled

**Reason:** Base and default environments are protected

**Solution:** Create a new environment instead, or clone and modify
```

```{tab-item} Import Fails
**Problem:** YAML import shows errors

**Possible causes:**
- ❌ Platform-specific packages (Linux vs macOS vs Windows)
- ❌ Channel not accessible
- ❌ Package versions no longer available

**Try:**
- ✅ Remove platform-specific packages from YAML
- ✅ Update version specs to be more flexible
- ✅ Check channel configuration
```

```{tab-item} Package Conflicts
**Problem:** "Solving environment" takes very long

**Solutions:**
- ✅ Use mamba instead of conda (faster solver)
- ✅ Specify fewer package constraints
- ✅ Try different channels
- ✅ Create fresh environment if heavily modified
```

````

`````

## Additional Notes

```{important}
**Protected Environments**

The `base` environment and your default JupyterLab environment cannot be removed. This prevents accidentally breaking your Gator/JupyterLab installation.
```

**Automatic Features:**

- 🔄 Package dependency resolution handled by conda/mamba
- 💬 Notifications for all operations (success, errors, warnings)
- 📊 Real-time status indicators
- 🔒 Safe defaults (confirmations for destructive actions)

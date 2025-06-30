# Contributing to Gator

Thank you for your interest in contributing to Gator! This document will help you set up your development environment.

## Development Environment Setup

### Prerequisites

- Conda or Mamba (v1.x) package manager. Mamba v2.x is not currently supported.

> **Note**: Python and Node.js will be automatically installed when you create the development environment.

### Project Structure

This project uses Lerna to manage multiple JavaScript/TypeScript packages in a monorepo structure. The main packages are:
- `@mamba-org/gator-common`: Base components and models
- `@mamba-org/gator-lab`: JupyterLab extension
- `@mamba-org/navigator`: Standalone application

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/mamba-org/gator.git
   cd gator
   ```

2. **Create and activate a conda environment**
   ```bash
   # Using conda
   conda create -c conda-forge -n gator python=3.9 nodejs jupyterlab=4.0 nb_conda_kernels
   conda activate gator

   # Or using mamba
   mamba create -c conda-forge -n gator python=3.9 nodejs jupyterlab=4.0 nb_conda_kernels
   mamba activate gator
   ```

3. **Enable Corepack for Yarn management**
   ```bash
   corepack enable
   ```

4. **Install Node.js dependencies**
   ```bash
   jlpm install
   ```

5. **Install the package in development mode**
   ```bash
   python -m pip install -e .
   ```

6. **Install Jupyter extension in development mode**
   ```bash
   jupyter labextension develop . --overwrite
   ```

### Common Yarn Commands

When working with the JavaScript/TypeScript packages, you can use these yarn commands
which are wrapped in to a command called jlpm. Note that while this project uses Lerna for monorepo management,
the commands are also executed using jlpm:

```bash
# Install dependencies for all packages (uses yarn workspaces)
jlpm install

# Build all packages (uses lerna run build internally)
jlpm run build

# Build packages in development mode
jlpm run build:dev

# Build packages for production
jlpm run build:prod

# Run tests for all packages (uses lerna run test internally)
jlpm run test

# Run linters
jlpm run eslint:check
jlpm run prettier:check

# Fix linting issues
jlpm run eslint
jlpm run prettier

# Clean build artifacts (uses lerna run clean internally)
jlpm run clean
```

### Running Tests

To run the tests, you can use the following commands:

```bash
# Run Python tests
python -m pytest mamba_gator

# Run JavaScript tests
jlpm run test

# Run linters
flake8 setup.py mamba_gator
jlpm run eslint:check
```

### Verifying Installation

After installation, you can verify that everything is set up correctly:

```bash
# Check lab extensions
jupyter labextension list
jupyter labextension list 2>&1 | grep "@mamba-org/gator-lab.*OK"

# Run browser check
python -m jupyterlab.browser_check
```

## Development Workflow

1. Create a new branch for your feature or bugfix
2. Make your changes
3. Run the test suite to ensure everything works
4. Submit a pull request

## Code Style

- Python code should follow PEP 8 guidelines
- JavaScript code should pass ESLint checks
- Run `flake8` and `jlpm run eslint:check` before submitting changes

## Need Help?

If you encounter any issues during setup or have questions about contributing, please open an issue on GitHub. 

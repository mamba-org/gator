# Release Guide for mamba_gator

This guide explains how to release mamba_gator packages.

## Release Process

### Dedicated Test PyPI Workflow

For testing releases, use the dedicated Test PyPI workflow:

1. **Prepare the release**:
   - Update version in `pyproject.toml` and `package.json`
   - Commit and push changes
   - Create and push a git tag (e.g., `v5.2.1`)

2. **Run the workflow**:
   - Go to the "Actions" tab in your repository
   - Select the "TestPyPI Publish Release" workflow
   - Click "Run workflow"

### Dedicated Production PyPI Workflow

For production releases, use the dedicated PyPI workflow:

1. **Prepare the release** (Only necessary if not previously followed in the TestPyPI workflow):
   - Update version in `pyproject.toml` and `package.json`
   - Commit and push changes
   - Create and push a git tag (e.g., `v5.2.1`)

2. **Run the workflow**:
   - Go to the "Actions" tab in your repository
   - Select the "PyPI Publish Release" workflow
   - Click "Run workflow"
   - Fill in the parameters:
     - **Confirm Production**: **Must be checked** to confirm this is a production release

## Recommended Release Workflow

### Step-by-Step Process

1. **Update Version** (Manual):
   ```bash
   # Update version in pyproject.toml and package.json
   # Example: Change from "5.2.1.dev0" to "5.2.1"
   ```

2. **Commit and Tag**:
   ```bash
   git add pyproject.toml package.json
   git commit -m "Bump version to 5.2.1"
   git push origin main
   
   # Create and push tag
   git tag v5.2.1
   git push origin v5.2.1
   ```

3. **Test Release** (GitHub Actions):
   - Run the "TestPyPI Publish Release" workflow with tag `v5.2.1`
   - Verify the package installs correctly from Test PyPI

4. **Production Release** (GitHub Actions):
   - Run the "PyPI Publish Release" workflow with tag `v5.2.1`
   - Confirm production release

5. **Bump to Dev Version** (Manual):
   ```bash
   # Update version to next dev version
   # Example: Change from "5.2.1" to "5.2.2.dev0"
   git add pyproject.toml package.json
   git commit -m "Bump version to 5.2.2.dev0"
   git push origin main
   ```

## Version Management

The project uses semantic versioning (X.Y.Z):

- **X**: Major version (breaking changes)
- **Y**: Minor version (new features, backward compatible)
- **Z**: Patch version (bug fixes, backward compatible)

### Development Versions

For development versions, use the `.dev0` suffix:
- `5.2.1.dev0` for development of version 5.2.1

### Pre-release Versions

For pre-releases, use alpha, beta, or release candidate suffixes:
- `5.2.1a1` for alpha release
- `5.2.1b1` for beta release
- `5.2.1rc1` for release candidate

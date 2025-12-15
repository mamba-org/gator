import * as React from 'react';
import { style } from 'typestyle';
import { CommandRegistry } from '@lumino/commands';
import { Conda, IEnvironmentManager } from '../tokens';
import { PythonVersionSelector } from './PythonVersionSelector';
import { PackageSearchBar } from './PackageSearchBar';
import { PackageSelectionList } from './PackageSelectionList';
import { SelectedPackagesPanel } from './SelectedPackagesPanel';

/**
 * Create environment overlay properties
 */
export interface ICreateEnvDrawerProps {
  /**
   * Environment manager
   */
  model: IEnvironmentManager;
  /**
   * Commands
   */
  commands: CommandRegistry;
  /**
   * Close drawer handler
   */
  onClose: () => void;
  /**
   * On environment created handler
   */
  onEnvironmentCreated: (envName: string) => void;
  /**
   * Environment types
   */
  environmentTypes: string[];
  packages: Conda.IPackage[];
  hasDescription: boolean;
}

export const CreateEnvDrawer = (props: ICreateEnvDrawerProps): JSX.Element => {
  const [envName, setEnvName] = React.useState('');
  const [envNameTouched, setEnvNameTouched] = React.useState(false);
  const [envType, setEnvType] = React.useState(props.environmentTypes[0] || '');
  const [pythonVersion, setPythonVersion] = React.useState('auto');
  const [pythonVersionFromType, setPythonVersionFromType] =
    React.useState<string>('auto');
  const [isPythonOverridden, setIsPythonOverridden] = React.useState(false);
  const [hasPythonInType, setHasPythonInType] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [creationStatus, setCreationStatus] = React.useState('');
  const [selectedPackages, setSelectedPackages] = React.useState<
    Map<string, string>
  >(new Map());
  const [searchTerm, setSearchTerm] = React.useState('');
  const isLoading = props.packages.length === 0;
  const [errorMessage, setErrorMessage] = React.useState('');

  // Effect to preload packages AND sync Python version when environment type changes
  React.useEffect(() => {
    if (!envType) {
      return;
    }

    const typePackages = props.model.getEnvironmentFromType(envType);
    const pythonSpec = typePackages.find(spec => spec.startsWith('python'));
    let resolvedPythonVersion = 'auto';

    const typeHasPython = !!pythonSpec;
    setHasPythonInType(typeHasPython);

    if (pythonSpec) {
      const [, versionConstraint] = pythonSpec.split('=');
      if (versionConstraint) {
        // Try to resolve to a full version from available packages
        const pythonPkg = props.packages.find(p => p.name === 'python');
        if (pythonPkg) {
          const matchingVersion = pythonPkg.version.find(v =>
            v.startsWith(versionConstraint)
          );
          resolvedPythonVersion = matchingVersion || versionConstraint;
        } else {
          resolvedPythonVersion = versionConstraint;
        }
      }
    }

    setPythonVersionFromType(resolvedPythonVersion);
    setPythonVersion(typeHasPython ? resolvedPythonVersion : 'auto');
    setIsPythonOverridden(false);

    if (typePackages.length === 0 || props.packages.length === 0) {
      return;
    }

    const newSelectedPackages = new Map<string, string>();

    typePackages.forEach(pkgSpec => {
      // Parse package spec (e.g., "python=3" -> name="python", versionConstraint="3")
      const [pkgName, versionConstraint] = pkgSpec.split('=');

      // Find package in available packages
      const pkg = props.packages.find(p => p.name === pkgName);

      if (pkg) {
        let selectedVersion: string;

        if (versionConstraint) {
          // Try to find a version that starts with the constraint (e.g., "3" matches "3.11", "3.10")
          const matchingVersion = pkg.version.find(v =>
            v.startsWith(versionConstraint)
          );
          // Use matching version, or latest if no match, or the constraint itself
          selectedVersion =
            matchingVersion ||
            pkg.version[pkg.version.length - 1] ||
            versionConstraint;
        } else {
          // Use latest available version
          selectedVersion = '';
        }

        newSelectedPackages.set(pkgName, selectedVersion);
      } else {
        // Package not found in available packages. Add it anyway with the spec version
        const version = versionConstraint || '';
        newSelectedPackages.set(pkgName, version);
      }
    });

    setSelectedPackages(newSelectedPackages);
  }, [envType, props.packages, props.model]);

  const handleTogglePackage = (pkg: Conda.IPackage) => {
    if (isCreating) {
      return;
    }

    setSelectedPackages(prev => {
      const newMap = new Map(prev);
      if (newMap.has(pkg.name)) {
        newMap.delete(pkg.name);
      } else {
        newMap.set(pkg.name, 'auto');
      }
      return newMap;
    });
  };

  const handleVersionChange = (pkg: Conda.IPackage, version: string) => {
    if (isCreating) {
      return;
    }

    if (pkg.name === 'python') {
      setPythonVersion(version);
      setIsPythonOverridden(version !== pythonVersionFromType);
    }

    setSelectedPackages(prev => {
      const newMap = new Map(prev);

      if (version === 'auto' && !newMap.has(pkg.name)) {
        // If selecting 'auto' on an unselected package, don't select it
        // Only auto-select when choosing a specific version
        return prev;
      }

      // Auto-select the package when changing version (even if not previously selected)
      newMap.set(pkg.name, version);
      return newMap;
    });
  };

  const handleRemovePackage = (pkgName: string) => {
    if (isCreating) {
      return;
    }

    setSelectedPackages(prev => {
      const newMap = new Map(prev);
      newMap.delete(pkgName);
      return newMap;
    });
  };

  const handleSearch = (event: React.FormEvent) => {
    if (isCreating) {
      return;
    }
    const value = (event.target as HTMLInputElement).value;
    setSearchTerm(value);
  };

  const filteredPackages = React.useMemo(() => {
    if (!searchTerm) {
      return props.packages;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return props.packages
      .filter(pkg => pkg.name.toLowerCase().includes(lowerSearch))
      .sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(lowerSearch);
        const bStartsWith = b.name.toLowerCase().startsWith(lowerSearch);
        if (aStartsWith && !bStartsWith) {
          return -1;
        }
        if (!aStartsWith && bStartsWith) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [props.packages, searchTerm]);

  const handleCreate = async () => {
    if (!envName.trim()) {
      console.error('Environment name is required');
      return;
    }

    if (isCreating) {
      return;
    }
    setIsCreating(true);
    setErrorMessage('');
    setCreationStatus('Creating environment...');

    let result: {
      success: boolean;
      message: string;
      cancelled: boolean;
    } = {
      success: false,
      message: '',
      cancelled: false
    };

    try {
      const packageSpecs: string[] = [];

      selectedPackages.forEach((version, name) => {
        if (version && version !== 'auto' && version !== 'none') {
          packageSpecs.push(`${name}=${version}`);
        } else if (version !== 'none') {
          packageSpecs.push(name);
        }
      });
      if (selectedPackages.size > 0) {
        result = await props.commands.execute('gator-lab:create-env', {
          name: envName,
          type: envType,
          packages: packageSpecs
        });
      }

      if (result.success || result.cancelled) {
        props.onEnvironmentCreated(envName);
        props.onClose();
      } else {
        setCreationStatus('');
        setErrorMessage(result.message || 'Unknown error');
      }
      setIsCreating(false);
    } catch (error) {
      console.error(
        'Failed to create environment with selected packages:',
        error
      );
      setIsCreating(false);
      setCreationStatus('');
      setErrorMessage('An unexpected error occurred');
    }
  };

  const handleResetPythonVersion = () => {
    setPythonVersion(pythonVersionFromType);
    setIsPythonOverridden(false);

    setSelectedPackages(prev => {
      if (!prev.has('python')) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set('python', pythonVersionFromType);
      return newMap;
    });
  };

  const showNameError = envNameTouched && !envName.trim();

  return (
    <div>
      <div className={Style.Overlay}>
        <div style={Style.Drawer}>
          <div style={Style.TopHeader}>
            <h3>Create Environment: Manual</h3>
            <button
              className={Style.CloseButton}
              onClick={props.onClose}
              disabled={isCreating}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {creationStatus && (
            <div className={Style.StatusMessage}>{creationStatus}</div>
          )}

          {errorMessage && (
            <div className={Style.ErrorMessage}>{errorMessage}</div>
          )}

          <div style={Style.MainContent}>
            <div style={Style.LeftColumn}>
              <div style={Style.DetailsSection}>
                <div style={Style.DetailsFields}>
                  <div style={Style.FieldGroup}>
                    <label className={Style.Label}>Name</label>
                    <input
                      className={showNameError ? Style.InputError : Style.Input}
                      type="text"
                      placeholder="Environment name"
                      value={envName}
                      onChange={e => setEnvName(e.target.value)}
                      onBlur={() => setEnvNameTouched(true)}
                      disabled={isCreating}
                    />
                  </div>

                  <div style={Style.FieldGroup}>
                    <label className={Style.Label}>Type</label>
                    <select
                      className={Style.Select}
                      value={envType}
                      onChange={e => setEnvType(e.target.value)}
                      disabled={isCreating}
                    >
                      {props.environmentTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={Style.FieldGroup}>
                    <label className={Style.Label}>Python Version</label>
                    <PythonVersionSelector
                      selectedVersion={pythonVersion}
                      onResetToTypeVersion={handleResetPythonVersion}
                      versionFromType={pythonVersionFromType}
                      isOverridden={isPythonOverridden}
                      disabled={!hasPythonInType}
                    />
                  </div>
                </div>
              </div>

              <div style={Style.PackageSection}>
                <div style={Style.PackageHeaderRow}>
                  <div className={Style.SectionTitle}>Select packages:</div>
                  <div style={{ width: '50%' }}>
                    <PackageSearchBar
                      searchTerm={searchTerm}
                      onSearch={handleSearch}
                      placeholder="Search"
                    />
                  </div>
                </div>
                <div style={Style.PackageListContainer}>
                  <PackageSelectionList
                    packages={filteredPackages}
                    selectedPackages={selectedPackages}
                    onTogglePackage={handleTogglePackage}
                    onVersionChange={handleVersionChange}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>

            <div style={Style.SelectionPanel}>
              <div style={Style.SelectionPanelHeader}>
                <h3>Selected Packages</h3>
              </div>
              <div style={Style.SelectionPanelContent}>
                <SelectedPackagesPanel
                  selectedPackages={selectedPackages}
                  onRemovePackage={handleRemovePackage}
                />
              </div>
            </div>
          </div>

          <div style={Style.Footer}>
            <button
              className={Style.CancelButton}
              onClick={props.onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              className={Style.PrimaryButton}
              onClick={handleCreate}
              disabled={
                isCreating || !envName.trim() || selectedPackages.size === 0
              }
            >
              {isCreating ? creationStatus || 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

namespace Style {
  export const Overlay = style({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  export const Drawer = {
    backgroundColor: 'var(--jp-layout-color1)',
    border: '1px solid var(--jp-border-color1)',
    borderRadius: '4px',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
  };

  export const TopHeader = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    borderBottom: '1px solid var(--jp-border-color1)',
    minHeight: '4%'
  };

  export const CloseButton = style({
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'var(--jp-ui-font-color1)',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    $nest: {
      '&:hover': {
        color: 'var(--jp-ui-font-color0)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    }
  });

  export const StatusMessage = style({
    padding: '12px 16px',
    margin: '8px',
    backgroundColor: 'var(--jp-info-color3)',
    border: '1px solid var(--jp-info-color1)',
    borderRadius: '3px',
    color: 'var(--jp-ui-font-color1)',
    fontSize: '13px',
    fontWeight: 500,
    textAlign: 'center'
  });

  export const ErrorMessage = style({
    padding: '12px 16px',
    margin: '8px',
    backgroundColor: 'var(--jp-error-color3)',
    border: '1px solid var(--jp-error-color1)',
    borderRadius: '3px',
    color: 'var(--jp-ui-font-color1)',
    fontSize: '13px',
    fontWeight: 500,
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    maxHeight: '150px',
    overflowY: 'auto'
  });

  export const MainContent = {
    display: 'flex',
    flexDirection: 'row' as const,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  };

  export const LeftColumn = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: '350px',
    overflow: 'hidden'
  };

  export const DetailsSection = {
    padding: '8px 8px',
    borderBottom: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    flexShrink: 0,
    maxHeight: '10%',
    overflow: 'auto'
  };

  export const DetailsFields = {
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '24px',
    flexWrap: 'wrap' as const,
    alignItems: 'flex-start'
  };

  export const FieldGroup = {
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: '180px',
    gap: '6px'
  };

  export const SectionTitle = style({
    fontSize: '13px',
    color: 'var(--jp-ui-font-color1)',
    fontWeight: 600,
    marginBottom: '8px'
  });

  export const PackageSection = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
    overflow: 'hidden'
  };

  export const PackageHeaderRow = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color1)',
    flexShrink: 0
  };

  export const PackageListContainer = {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
    height: '100%'
  };

  export const SelectionPanel = {
    width: '250px',
    minWidth: '120px',
    display: 'flex',
    flexDirection: 'column' as const,
    borderLeft: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    overflow: 'hidden',
    flexShrink: 1
  };

  export const SelectionPanelHeader = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0px 0px',
    borderBottom: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color1)',
    flexShrink: 0,
    maxHeight: '8%'
  };

  export const SelectionPanelContent = {
    flex: 1,
    overflow: 'auto',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    minHeight: 0
  };

  export const Footer = {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '8px 8px',
    borderTop: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    gap: '8px',
    flexShrink: 0,
    minHeight: '22px'
  };

  export const Label = style({
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--jp-ui-font-color1)',
    marginBottom: '0'
  });

  export const Input = style({
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '3px',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    boxSizing: 'border-box' as const,
    $nest: {
      '&:focus': {
        outline: 'none',
        borderColor: 'var(--jp-brand-color1)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    }
  });

  export const InputError = style({
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--jp-error-color1)',
    borderRadius: '3px',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    boxSizing: 'border-box' as const,
    $nest: {
      '&:focus': {
        outline: 'none',
        borderColor: 'var(--jp-error-color1)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    }
  });

  export const Select = style({
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    border: '1px solid var(--jp-border-color2)',
    borderRadius: '3px',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
    $nest: {
      '&:focus': {
        outline: 'none',
        borderColor: 'var(--jp-brand-color1)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    }
  });

  export const CancelButton = style({
    padding: '8px 16px',
    border: '1px solid var(--jp-border-color2)',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '13px',
    $nest: {
      '&:hover:not(:disabled)': {
        color: 'var(--jp-ui-font-color0)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
        color: 'var(--jp-ui-font-color3)'
      }
    }
  });

  export const PrimaryButton = style({
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'var(--jp-brand-color1)',
    color: 'white',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '13px',
    $nest: {
      '&:hover:not(:disabled)': {
        color: 'var(--jp-ui-font-color0)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
        backgroundColor: 'var(--jp-layout-color3)',
        color: 'var(--jp-ui-font-color3)'
      }
    }
  });
}

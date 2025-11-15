import * as React from 'react';
import { InputGroup } from '@jupyterlab/ui-components';
import { classes, style } from 'typestyle/lib';
import { Conda } from '../tokens';
import { CondaPkgList } from './CondaPkgList';
import { PACKAGE_TOOLBAR_HEIGHT } from './CondaPkgToolBar';
import { applyPackageChanges } from '../packageActions';

export interface ICondaPkgDrawerProps {
  /**
   * Package manager
   */
  pkgModel: Conda.IPackageManager;
  /**
   * All packages (for filtering uninstalled packages)
   */
  packages: Conda.IPackage[];
  /**
   * Environment name
   */
  envName: string;
  /**
   * Drawer height
   */
  height: number;
  /**
   * Are package descriptions available?
   */
  hasDescription: boolean;
  /**
   * Is the package list loading?
   */
  isLoading: boolean;
  /**
   * Package item graph dependencies handler
   */
  onPkgGraph: (pkg: Conda.IPackage) => void;
  /**
   * Drawer close handler
   */
  onClose: () => void;
  /**
   * Package selection handler
   */
  onPkgClick: (pkg: Conda.IPackage) => void;
  /**
   * Callback called when packages are installed successfully
   */
  onPackagesInstalled?: () => void;
}

export const CondaPkgDrawer: React.FunctionComponent<ICondaPkgDrawerProps> = (
  props: ICondaPkgDrawerProps
) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isApplyingChanges, setIsApplyingChanges] = React.useState(false);
  const [selectedPackages, setSelectedPackages] = React.useState<
    Conda.IPackage[]
  >([]);

  const handleClose = () => {
    selectedPackages.forEach(pkg => {
      pkg.version_selected = 'none';
    });
    setSelectedPackages([]);
    props.onClose();
  };

  const handleSearch = (event: React.FormEvent) => {
    if (isApplyingChanges) {
      return;
    }

    const value = (event.target as HTMLInputElement).value;
    setSearchTerm(value);
  };

  const handleVersionSelection = (pkg: Conda.IPackage, version: string) => {
    if (isApplyingChanges) {
      return;
    }

    pkg.version_selected = version;

    if (version !== 'none') {
      setSelectedPackages(prev => {
        if (prev.includes(pkg)) return prev;
        return [...prev, pkg];
      });
    } else {
      setSelectedPackages(prev => prev.filter(p => p !== pkg));
    }
  };

  const handlePackageSelection = (pkg: Conda.IPackage) => {
    if (isApplyingChanges) {
      return;
    }

    // For uninstalled packages, toggle version_selected between 'none' and ''
    if (pkg.version_selected !== 'none') {
      // It's currently selected, so deselect
      pkg.version_selected = 'none';
      setSelectedPackages(selectedPackages.filter(p => p !== pkg));
    } else {
      // It's currently not selected, so select with 'Any' version
      pkg.version_selected = '';
      setSelectedPackages([...selectedPackages, pkg]);
    }
  };

  const handleRemoveSelected = (pkg: Conda.IPackage) => {
    if (isApplyingChanges) {
      return;
    }

    // Reset version_selected to 'none' when removing from selection
    pkg.version_selected = 'none';
    setSelectedPackages(selectedPackages.filter(p => p !== pkg));
  };

  const handleInstall = async (): Promise<void> => {
    if (isApplyingChanges) {
      return;
    }

    setIsApplyingChanges(true);

    try {
      if (selectedPackages.length > 0) {
        await applyPackageChanges(
          props.pkgModel,
          selectedPackages,
          props.envName
        );

        // Reset version_selected for all selected packages
        selectedPackages.forEach(pkg => {
          pkg.version_selected = 'none';
        });

        setSelectedPackages([]);
        setIsApplyingChanges(false);

        if (props.onPackagesInstalled) {
          props.onPackagesInstalled();
        }
      }

      props.onClose();
    } catch (error) {
      console.error('Failed to install packages:', error);
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const handleClearSelection = () => {
    if (isApplyingChanges) {
      return;
    }

    selectedPackages.forEach(pkg => {
      pkg.version_selected = 'none';
    });
    setSelectedPackages([]);
  };

  // Filter packages based on search term
  const searchPackages = props.packages.filter(pkg => {
    if (!searchTerm) {
      return true;
    }
    const lowerSearch = searchTerm.toLowerCase();
    const lowerName = pkg.name.toLowerCase();

    return (
      lowerName.indexOf(lowerSearch) >= 0 ||
      (props.hasDescription &&
        (pkg.summary.toLowerCase().indexOf(lowerSearch) >= 0 ||
          pkg.keywords.indexOf(lowerSearch) >= 0 ||
          pkg.tags.indexOf(lowerSearch) >= 0))
    );
  });

  const renderPkgsSelected = (): JSX.Element => {
    if (selectedPackages.length === 0) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            color: 'var(--jp-ui-font-color2)',
            fontSize: '13px',
            fontStyle: 'italic'
          }}
        >
          No packages selected
        </div>
      );
    }

    return (
      <>
        {selectedPackages.map(pkg => (
          <div key={pkg.name} className={Style.SelectedItem}>
            <span style={Style.SelectedItemName}>{pkg.name}</span>
            <button
              className={Style.RemoveButton}
              onClick={() => handleRemoveSelected(pkg)}
              aria-label={`Remove ${pkg.name}`}
              title="Remove from selection"
            >
              ×
            </button>
          </div>
        ))}
      </>
    );
  };

  return (
    <div style={Style.Overlay}>
      <div style={Style.Drawer}>
        <div style={Style.Header}>
          <h3>Add Packages to &lsquo;{props.envName}&lsquo;</h3>
          <button
            className={Style.CloseButton}
            onClick={handleClose}
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>
        <div style={Style.MainContent}>
          <div style={Style.LeftColumn}>
            <div style={Style.LeftColumnHeaderRow}>
              <div className={Style.LeftColumnHeader}>Select Package(s):</div>
              <InputGroup
                className={classes(Style.Search, Style.SearchInput)}
                type="text"
                placeholder="Search packages"
                onChange={handleSearch}
                value={searchTerm}
                rightIcon="search"
              />
            </div>
            <div style={Style.Content}>
              <CondaPkgList
                height={props.height - PACKAGE_TOOLBAR_HEIGHT}
                hasDescription={props.hasDescription}
                packages={searchPackages}
                isLoading={props.isLoading || isApplyingChanges}
                onPkgClick={handlePackageSelection}
                onPkgChange={handleVersionSelection}
                onPkgGraph={props.onPkgGraph}
              />
            </div>
          </div>
          <div style={Style.SelectionPanel}>
            <div style={Style.SelectionPanelHeader}>
              <span style={Style.SelectionInfo}>
                {selectedPackages.length} package(s) selected
              </span>
            </div>
            <div style={Style.SelectionPanelContent}>
              {renderPkgsSelected()}
            </div>
            <div style={Style.SelectionPanelFooter}>
              <button
                className={Style.ClearButton}
                onClick={handleClearSelection}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div style={Style.Footer}>
          <button className={Style.CancelButton} onClick={handleClose} disabled={isApplyingChanges}>
            Cancel
          </button>
          <button
            className={Style.InstallButton}
            onClick={handleInstall}
            disabled={selectedPackages.length === 0 || isApplyingChanges}
          >
            {isApplyingChanges ? 'Installing...' : 'Install Selected'}
          </button>
        </div>
      </div>
    </div>
  );
};

namespace Style {
  export const Overlay = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

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

  export const Header = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    borderBottom: '1px solid var(--jp-border-color1)',
    height: '20px'
  };

  export const SelectionPanelFooter = {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '8px 12px',
    borderTop: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    gap: '8px',
    flexShrink: 0,
    height: '18px'
  };

  export const ClearButton = style({
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--jp-ui-font-color1)',
    cursor: 'pointer',
    fontSize: '13px',
    $nest: {
      '&:hover': {
        color: 'var(--jp-ui-font-color0)'
      }
    }
  });

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
      }
    }
  });

  export const Search = style({
    padding: '2px'
  });

  export const SearchInput = style({
    flex: 1,
    minWidth: 0,
    maxWidth: '400px'
  });

  export const MainContent = {
    display: 'flex',
    flexDirection: 'row' as const,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  };

  export const Content = {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0
  };

  export const LeftColumn = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0,
    overflow: 'hidden'
  };

  export const LeftColumnHeaderRow = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 10px',
    borderBottom: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    flexShrink: 0
  };

  export const LeftColumnHeader = style({
    fontSize: '13px',
    color: 'var(--jp-ui-font-color1)',
    fontWeight: '600' as const,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0
  });

  export const SelectionPanel = {
    width: '220px',
    display: 'flex',
    flexDirection: 'column' as const,
    borderLeft: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    overflow: 'hidden'
  };

  export const SelectionPanelHeader = {
    padding: '10px 8px',
    borderBottom: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color1)',
    flexShrink: 0
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
    padding: '12px 16px',
    borderTop: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color2)',
    gap: '8px',
    flexShrink: 0,
    height: '18px'
  };

  export const SelectionInfo = {
    color: 'var(--jp-ui-font-color2)',
    fontSize: '12px',
    fontWeight: '600' as const
  };

  export const CancelButton = style({
    padding: '8px 16px',
    border: '1px solid var(--jp-border-color1)',
    backgroundColor: 'var(--jp-layout-color1)',
    color: 'var(--jp-ui-font-color1)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    $nest: {
      '&:hover': {
        color: 'var(--jp-ui-font-color0)'
      }
    }
  });

  export const InstallButton = style({
    padding: '8px 16px',
    border: 'none',
    backgroundColor: 'var(--jp-brand-color1)',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    $nest: {
      '&:hover': {
        color: 'var(--jp-ui-font-color0)'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
        backgroundColor: 'var(--jp-layout-color3)',
        color: 'var(--jp-ui-font-color3)'
      },
      '&:disabled:hover': {
        color: 'var(--jp-ui-font-color3)'
      }
    }
  });

  export const SelectedItem = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    padding: '6px 8px',
    backgroundColor: 'var(--jp-layout-color1)',
    borderRadius: '4px',
    border: '1px solid var(--jp-border-color2)',
    transition: 'all 0.15s ease',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-layout-color0)',
        borderColor: 'var(--jp-border-color1)'
      }
    }
  });

  export const SelectedItemName = {
    fontSize: '11px',
    color: 'var(--jp-ui-font-color1)',
    fontFamily: 'var(--jp-code-font-family)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1
  };

  export const RemoveButton = style({
    background: 'none',
    border: 'none',
    color: 'var(--jp-ui-font-color2)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    $nest: {
      '&:hover': {
        backgroundColor: 'var(--jp-error-color3)',
        color: 'var(--jp-error-color1)'
      }
    }
  });
}

import * as React from 'react';

export interface CondaPkgToolBarProps {
  category: 'all' | 'installed' | 'available' | 'updatable' | 'selected',
  hasSelection: boolean,
  onCategoryChanged(),
  onSearch(),
  onApply(),
  onCancel()
}

export const CondaPkgToolBar = (props: CondaPkgToolBarProps) => {
  return (
    <div>
      <select value={props.category} onChange={props.onCategoryChanged}>
        <option value='all'>All</option>        
        <option value='installed'>Installed</option>        
        <option value='available'>Not installed</option>        
        <option value='updatable'>Updatable</option>        
        <option value='selected'>Selected</option>        
      </select>
      <input type='search' placeholder='Search Packages' />
      <button type='button' onClick={props.onSearch}>Go</button>
      {props.hasSelection && <button type='button' onClick={props.onApply}>Apply</button>}
      {props.hasSelection && <button type='button' onClick={props.onCancel}>Clear</button>}
    </div>
  );
}
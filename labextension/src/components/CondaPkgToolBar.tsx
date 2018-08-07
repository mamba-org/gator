import * as React from 'react';
import { GlobalStyle } from './globalStyles';
import { classes, style } from 'typestyle/lib';

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
    <div className={classes(Style.Toolbar, 'jp-Toolbar')}>
      <div className='jp-Toolbar-item'>
        <div className='jp-select-wrapper'>
          <select 
            className={Style.Select}
            value={props.category} 
            onChange={props.onCategoryChanged}>
              <option value='all'>All</option>        
              <option value='installed'>Installed</option>        
              <option value='available'>Not installed</option>        
              <option value='updatable'>Updatable</option>        
              <option value='selected'>Selected</option>        
          </select>
        </div>
      </div>
      <div className={classes('jp-Toolbar-item', Style.Search)}>
        <input 
          className={Style.SearchInput}
          type='search'
          onChange={props.onSearch}
          placeholder='Search Packages' />
      </div>
      <div className='jp-Toolbar-item jp-Toolbar-spacer'></div>
      {props.hasSelection && 
        <button
          className={classes(Style.Button, 'jp-mod-accept')} 
          type='button' 
          onClick={props.onApply}>
            Apply</button>}
      {props.hasSelection && 
        <button 
          className={classes(Style.Button, 'jp-mod-reject')} 
          type='button' 
          onClick={props.onCancel}>
            Clear</button>}
    </div>
  );
}

namespace Style{
  export const Toolbar = style({
    alignItems: 'center',
    height: 32
  });

  export const Select = style({
    flex: '1 1 auto',
    height: '32px',
    width: '100%',
    fontSize: 'var(--jp-ui-font-size2)',
    color: 'var(--jp-ui-font-color0)',
    paddingLeft: '8px',
    paddingRight: '8px',
    backgroundImage: 'var(--jp-ui-select-caret)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '99% center',
    backgroundSize: '18px',
    border: 'var(--jp-border-width) solid var(--jp-input-border-color)', //'none',
    borderRadius: 0,
    appearance: 'none',
    '-webkit-appearance': 'none',
    outline: 'none',
    backgroundColor: 'transparent',

    $nest:{
      '&:hover': {
        cursor: 'pointer',
        color: 'var(--jp-ui-font-color0)',
        boxShadow: 'inset 0 0px 1px rgba(0, 0, 0, 0.5)'
      }
    }
  });

  export const SearchInput = style({
    height: '30px',
    boxSizing: 'border-box',
    // border: 'none',
    paddingLeft: '7px',
    paddingRight: '7px',
    fontSize: 'var(--jp-ui-font-size2)',
    color: 'var(--jp-ui-font-color0)',
    outline: 'none',
    appearance: 'none',
    backgroundColor: 'transparent',
    border: 'var(--jp-border-width) solid var(--jp-brand-color1)',
    boxShadow: 'inset 0 0 4px var(--jp-brand-color2)',
    marginTop: 1,

    $nest:{
      '&:hover': {
        cursor: 'pointer',
        color: 'var(--jp-ui-font-color0)',
        boxShadow: 'inset 0 0px 1px rgba(0, 0, 0, 0.5)'
      }
    }
  })

  export const Search = style({
    display: 'flex',
    backgroundColor: 'var(--jp-input-active-background)',

    $nest: {
      '&::after': {
        content: '" "',
        color: 'white',
        backgroundColor: 'var(--jp-brand-color1)',
        // position: 'absolute',
        top: '8px',
        right: '8px',
        height: '30px',
        width: '12px',
        padding: '0px 12px',
        backgroundImage: 'var(--jp-icon-search)',
        backgroundSize: '20px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        marginTop: 1
      }
    }
  });

  export const Button = classes(
    style({
      margin: '0px 2px'
    }),
    GlobalStyle.Button)
}
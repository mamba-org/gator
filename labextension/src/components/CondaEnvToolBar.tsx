import * as React from 'react';
import { style } from 'typestyle';


export interface CondaEnvToolBarProps {
  onCreate(),
  onClone(),
  onImport(),
  onRemove()
}

export const CondaEnvToolBar = (props: CondaEnvToolBarProps) => {
  return (
    <div className='jp-Toolbar'>
      <button 
        className={Style.Button} 
        onClick={props.onCreate}>
          Create</button>
      <button 
        className={Style.Button} 
        onClick={props.onClone}>
          Clone</button>
      <button 
        className={Style.Button} 
        onClick={props.onImport}>
          Import</button>
      <button 
        className={Style.Button} 
        onClick={props.onRemove}>
          Remove</button>
    </div>
  );
}

namespace Style {
  export const Button = style({
    flex: '1 1 auto',
    display: 'inline-block',
    height: '24px',
    width: '32px',
    backgroundColor: 'var(--jp-layout-color1)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: '16px',
    border: '1px solid var(--jp-layout-color1)',
    paddingLeft: '8px',
    paddingRight: '8px',
    fontSize: 'var(--jp-ui-font-size1)',
    lineHeight: '28px', // var(--jp-private-toolbar-height);

    $nest: {
      '&:focus': {
        boxShadow: 'var(--jp-toolbar-box-shadow)',
        border: '1px solid var(--jp-toolbar-border-color)'
      },
      '&:enabled:hover': {
        border: '1px solid var(--jp-toolbar-border-color)',
        boxShadow: '0px 0px 2px 0px rgba(0,0,0,0.24)'
      },
      '&:enabled:active': {
        border: '1px solid var(--jp-toolbar-border-color)',
        backgroundColor: 'var(--jp-toolbar-active-background)',
        boxShadow: 'var(--jp-toolbar-box-shadow)'
      },
      '&:disabled': {
        opacity: 0.4
      }
    }
  });
}
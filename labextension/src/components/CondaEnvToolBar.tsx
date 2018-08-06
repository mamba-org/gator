import * as React from 'react';
import { CondaEnvToolBarStyle } from '../styles/CondaEnvStyles';


export interface CondaEnvToolBarProps {
  onCreate(),
  onClone(),
  onImport(),
  onRemove()
}

export const CondaEnvToolBar = (props: CondaEnvToolBarProps) => {
  return (
    <div className={CondaEnvToolBarStyle}>
      <button onClick={props.onCreate}>Create</button>
      <button onClick={props.onClone}>Clone</button>
      <button onClick={props.onImport}>Import</button>
      <button onClick={props.onRemove}>Remove</button>
    </div>
  );
}
import * as React from 'react';
import { CondaEnvToolBarStyle } from '../styles/CondaEnvStyles';


export interface CondaEnvToolBarProps {
  onCreate: () => void,
  onClone: () => void,
  onImport: () => void,
  onRemove: () => void
}

export const CondaEnvToolBar = (props: CondaEnvToolBarProps) => {
  return (
    <div className={CondaEnvToolBarStyle}>
      <button onClick={this.props.onCreate}>Create</button>
      <button onClick={this.props.onClone}>Clone</button>
      <button onClick={this.props.onImport}>Import</button>
      <button onClick={this.props.onRemove}>Remove</button>
    </div>
  );
}
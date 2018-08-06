import * as React from 'react';
import { DotsLoader } from './DotsLoader';

export interface CondaPkgStatusBarProps{
  isLoading: boolean,
  infoText: string
}

export const CondaPkgStatusBar = (props: CondaPkgStatusBarProps) => {
  return (
    <div>
      <p>{props.infoText}</p>
      {props.isLoading && <DotsLoader />}
    </div>
  );
}
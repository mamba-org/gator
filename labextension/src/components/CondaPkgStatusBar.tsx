import * as React from 'react';
import { DotsLoader } from './DotsLoader';
import { style } from 'typestyle/lib';

export interface CondaPkgStatusBarProps{
  isLoading: boolean,
  infoText: string
}

export const CondaPkgStatusBar = (props: CondaPkgStatusBarProps) => {
  return (
    <div className={Style.Container}>
      <div className={Style.Text}>
        {props.infoText}
      </div>
      {props.isLoading && 
        <div className={Style.Loader}>
          <DotsLoader />
        </div>}
    </div>
  );
}

namespace Style{
  export const Container = style({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  });

  export const Text = style({
    flex: '0 0 auto'
  });

  export const Loader = style({
    flex: '1 1 auto'
  });
}
import * as React from 'react';
import { style, keyframes } from 'typestyle';
import { NestedCSSProperties } from 'typestyle/lib/types';

// Credits goes to https://www.pexels.com/blog/css-only-loaders/
namespace Style{
  const DotsLoaderFrames = keyframes({
    '0%': {left: '0%'},
    '75%': {left: '100%'},
    '100%': {left: '100%'}
  })

  export const DotStyle =  (idx: number, size?: number): NestedCSSProperties => {
    if (size === undefined){
      size = 20
    }
    return { 
      width: size,
      height: size,
      position: 'relative',
      left: -1 * size,
      top: -1 * size * idx,
      backgroundColor: 'var(--jp-layout-color4)',
      borderRadius: '50%',
      animationName: DotsLoaderFrames,
      animationDuration: '4s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'cubic-bezier(.2,.64,.81,.23)',
      animationDelay: (idx * 150).toString() + 'ms'
    }
  };

  export const Container = style({
    overflowX: 'hidden'
  })
}

export interface DotsLoaderProps{
  nDots?: number
}

export const DotsLoader = (props: DotsLoaderProps) => {
  let dots = [];
  let n = props.nDots ? props.nDots : 4;
  
  for(let i = 0; i < n; i++){
    dots.push(<div key={'dots-' + i} className={style(Style.DotStyle(i, 10))}></div>);
  }
  return (
    <div className={Style.Container}>
      {dots}
    </div>
  );
}
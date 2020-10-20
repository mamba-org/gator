import { NestedCSSProperties } from 'typestyle/lib/types';

export namespace GlobalStyle {
  export const ListItem: NestedCSSProperties = {
    flex: '0 0 auto',
    border: '1px solid transparent',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--jp-ui-font-color1)',
    fontSize: 'var(--jp-ui-font-size1)',
    listStyleType: 'none'
  };
}

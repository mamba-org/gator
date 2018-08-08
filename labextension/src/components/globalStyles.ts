import { style, classes } from 'typestyle';
import { NestedCSSProperties } from 'typestyle/lib/types';

export namespace GlobalStyle {

  export const FaIcon : NestedCSSProperties = {
    minWidth: 16,
    minHeight: 16,
    display: 'inline-block',
    verticalAlign: 'text-top',
    fontWeight: 'bold',
    color: 'var(--jp-ui-font-color0)'
  };

  export const CustomizedButton = style({
    display: 'inline-block',
    height: '24px',
    // width: '32px',
    backgroundColor: 'var(--jp-layout-color1)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: '16px',
    border: '1px solid var(--jp-layout-color1)',
    paddingLeft: '8px',
    paddingRight: '8px',
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

  export const Button = classes(
    CustomizedButton,
    'jp-mod-styled' 
  );

  export const ListItem : NestedCSSProperties = {
    flex: '0 0 auto',
    border: '1px solid transparent',
    overflow: 'hidden',
    // padding: '2px 0 5px 5px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--jp-ui-font-color1)',
    fontSize: 'var(--jp-ui-font-size1)',
    listStyleType: 'none'
  }
}
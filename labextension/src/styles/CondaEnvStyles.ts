import { style } from 'typestyle';

export const CondaEnvListStyle = style({
  width: '100%',
  display: 'table',
  borderCollapse: 'collapse'
});

export const CondaEnvToolBarStyle = style({
  width: '100%',
  flexDirection: 'row'
});

export const EnvCreateIcon = style({
  // backgroundImage: 'var()'
});

export const EnvCloneIcon = style({
});

export const EnvImportIcon = style({});

export const EnvRemoveIcon = style({});

export const CellStyle = style({
  padding: '6px 12px',
  display: 'table-cell',
  width: '20%',
  verticalAlign: 'middle'
});

export const RowStyle = style({
  padding: '10px',
  width: '100%',
  display: 'table-row',
  borderBottom: 'solid',
  borderBottomColor: 'var(--jp-border-color1)',
  borderBottomWidth: 'var(--jp-border-width)',
  verticalAlign: 'middle',
  backgroundColor: 'var(--jp-layout-color0)',

  $nest: {
    '&:hover #shortcut-keys': {
      borderColor: 'var(--jp-border-color1)',
      background: 'var(--jp-layout-color2)',
    },
    '&:hover #add-link': {
      color: 'var(--jp-brand-color1)'
    }
  }
});
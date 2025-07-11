import { LabIcon } from '@jupyterlab/ui-components';
import condaSvgstr from '../style/conda.svg';
import externalLinkSvgstr from '../style/external-link.svg';
import cartArrowDownSvgstr from '../style/cart-arrow-down.svg';
import undoSvgstr from '../style/undo.svg';
import syncAltSvgstr from '../style/sync-alt.svg';

export const condaIcon = new LabIcon({
  name: '@mamba-org/gator-lab:conda',
  svgstr: condaSvgstr
});

export const externalLinkIcon = new LabIcon({
  name: '@mamba-org/gator-lab:external-link',
  svgstr: externalLinkSvgstr
});

export const cartArrowDownIcon = new LabIcon({
  name: '@mamba-org/gator-lab:cart-arrow-down',
  svgstr: cartArrowDownSvgstr
});

export const undoIcon = new LabIcon({
  name: '@mamba-org/gator-lab:undo',
  svgstr: undoSvgstr
});

export const syncAltIcon = new LabIcon({
  name: '@mamba-org/gator-lab:sync-alt',
  svgstr: syncAltSvgstr
});

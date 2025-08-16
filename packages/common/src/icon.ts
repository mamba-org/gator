import { LabIcon } from '@jupyterlab/ui-components';
import condaSvgstr from '../style/conda.svg';
import externalLinkSvgstr from '../style/external-link.svg';
import cartArrowDownSvgstr from '../style/cart-arrow-down.svg';
import undoSvgstr from '../style/undo.svg';
import cloneSvgstr from '../style/clone.svg';
import syncAltSvgstr from '../style/sync-alt.svg';
import ellipsisVerticalSvgstr from '../style/ellipsis-vertical.svg';
import { IconDefinition, library } from '@fortawesome/fontawesome-svg-core';
import {
  faClone,
  faSyncAlt,
  faCartArrowDown,
  faExternalLinkAlt,
  faExternalLinkSquareAlt,
  faMinusSquare,
  faUndoAlt,
  faCheckSquare,
  faSquare
} from '@fortawesome/free-solid-svg-icons';

import {
  faClone as faCloneRegular,
  faSquare as faSquareRegular
} from '@fortawesome/free-regular-svg-icons';

const icons: IconDefinition[] = [
  faClone,
  faSyncAlt,
  faCartArrowDown,
  faExternalLinkAlt,
  faExternalLinkSquareAlt,
  faMinusSquare,
  faUndoAlt,
  faCheckSquare,
  faSquare,
  faCloneRegular,
  faSquareRegular
];

library.add(...icons);

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

export const cloneIcon = new LabIcon({
  name: '@mamba-org/gator-lab:clone',
  svgstr: cloneSvgstr
});

export const syncAltIcon = new LabIcon({
  name: '@mamba-org/gator-lab:sync-alt',
  svgstr: syncAltSvgstr
});

export const ellipsisVerticalIcon = new LabIcon({
  name: '@mamba-org/gator-lab:ellipsis-vertical',
  svgstr: ellipsisVerticalSvgstr
});

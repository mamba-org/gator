import { LabIcon } from '@jupyterlab/ui-components';
import condaSvgstr from '../style/conda.svg';
import cloneSvgstr from '../style/clone.svg';

export const condaIcon = new LabIcon({
  name: '@mamba-org/gator-lab:conda',
  svgstr: condaSvgstr
});

export const cloneIcon = new LabIcon({
  name: '@mamba-org/gator-lab:clone',
  svgstr: cloneSvgstr
});

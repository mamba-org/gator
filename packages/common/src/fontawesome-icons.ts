// src/fontawesome-icons.ts
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

import { library } from '@fortawesome/fontawesome-svg-core';
import { dom } from '@fortawesome/fontawesome-svg-core';
import {
  faRotate,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faDownload,
  faColumns,
  faAlignJustify,
  faXmark,
  faComments,
  faCaretDown,
} from '@fortawesome/free-solid-svg-icons';

// Add icons to the library
library.add(
  faRotate,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faDownload,
  faColumns,
  faAlignJustify,
  faXmark,
  faComments,
  faCaretDown,
);

// Initialize Font Awesome DOM watching
dom.watch();

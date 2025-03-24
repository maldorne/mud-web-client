import jQuery from 'jquery';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { initializeCore } from './core.js';

import './mxp.js'; // Import MXP module for side effects
import './modal-input.js'; // ModalInput module for side effects

window.jQuery = window.$ = jQuery;

document.addEventListener('DOMContentLoaded', () => {
  initializeCore();
});

import jQuery from 'jquery';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { initializeCore } from './core.js';
import { config } from './config.js'; // Import the singleton instance

import './mxp.js'; // Import MXP module
import './modal-input.js'; // ModalInput module
import { ChatterBox } from './chatter-box.js'; // ChatterBox module

window.jQuery = window.$ = jQuery;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize config
  await config.initialize();

  initializeCore();

  if (config.chatterbox) {
    new ChatterBox();
  }
});

import jQuery from 'jquery';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { initializeCore } from './core.js';
import { config } from './config.js'; // Import the singleton instance
import { log } from './utils.js';

import './mxp.js'; // Import MXP module
import './modal-input.js'; // ModalInput module
import { ChatterBox } from './chatter-box.js'; // ChatterBox module
import { ControlPanel } from './control-panel.js'; // ControlPanel module

window.jQuery = window.$ = jQuery;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize config
  await config.initialize();

  log('Config initialized:', config);

  initializeCore();

  if (config.chatterbox) {
    new ChatterBox();
  }

  if (config.controlPanel) {
    let cp = new ControlPanel();
    await cp.initialize();
  }
});

import jQuery from 'jquery';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { initializeCore } from './core.js';
import { config } from './config.js'; // Import the singleton instance
import { log } from './utils.js';

import './mxp.js'; // Import MXP module
import './modal-input.js'; // ModalInput module
import { ChatterBox } from './chatter-box.js'; // ChatterBox module
import { ControlPanel } from './control-panel.js'; // ControlPanel module
import { GroupTab } from './group-tab.js'; // GroupTab module
import { IFrame } from './iframe.js';
// import { MistyBars } from './misty-bars.js'; // MistyBars module
import { LoginPrompt } from './login-prompt.js';

window.jQuery = window.$ = jQuery;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize config
  await config.initialize();

  log('Config initialized:', config);

  initializeCore();

  if (config.chatterbox) {
    new ChatterBox({
      drag: true, // Enable dragging
      snap: true, // Enable snapping to other windows
    });
  }

  // control panel has to be loaded before other modules, so the sitelist
  // is available
  if (config.controlPanel) {
    let cp = new ControlPanel({
      drag: true, // Enable dragging
      snap: true, // Enable snapping to other windows
    });
    await cp.initialize();
  }

  if (config.groupTab) {
    let gt = new GroupTab();
    await gt.initialize();
  }

  if (config.initialIFrame) {
    log('Loading initial URL:', config.initialURL);

    const helpFrame = new IFrame({
      id: '#help-frame',
      title: config.initialIFrame.title || 'Help',
      url: config.initialIFrame.URL,
      // refresh: 30, // refresh every 30 seconds
      css: {
        width: 800,
        height: 600,
        top: 0,
        left: '30%',
      },
      handle: '.handle', // Use the default Window handle class
      drag: true, // Enable dragging
      snap: true, // Enable snapping to other windows
    });

    helpFrame.initialize();
  }

  // const bars = new MistyBars({
  //   title: 'Custom Bars',
  //   listen: 'custom-event',
  // });

  const loginPrompt = new LoginPrompt({
    gmcp: true,
    placeholder: 'Username',
    // ... other options
  });
});

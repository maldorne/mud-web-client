import jQuery from 'jquery';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { initializeCore } from './core.js';
import { Config } from './config.js';

import './mxp.js'; // Import MXP module
import './modal-input.js'; // ModalInput module
import { ChatterBox } from './chatter-box.js'; // ChatterBox module

window.jQuery = window.$ = jQuery;

document.addEventListener('DOMContentLoaded', () => {
  initializeCore();

  if (Config.chatterBox) {
    new ChatterBox({
      id: '#chat-window',
      title: 'ChatterBox',
      tabs: [
        {
          name: 'Creators',
          channels: ['cre'],
          match: '\\[(Cre)\\] ([^:]+): (.+)', // Three capture groups: channel, name, message
          replace:
            '<span class="creator">[<span style="color:#FFD700">$1</span>] <span style="color:#00CED1">$2</span>: $3</span>',
          time: true,
          scroll: true,
        },
        {
          name: 'Support',
          channels: ['support'],
          match: '\\[(Support)\\] ([^:]+): (.+)',
          replace:
            '<span class="support">[<span style="color:#FF69B4">$1</span>] <span style="color:#4169E1">$2</span>: $3</span>',
          time: true,
          scroll: true,
        },
        // {
        //   name: 'Say',
        //   match: "^(\\w+) says '([^']+)'$", // Two capture groups: name and message
        //   replace: "<span style='color:yellow'>$1</span> says '$2'", // $1=name, $2=message
        //   time: true,
        //   scroll: true,
        // },
        // {
        //   name: 'Tell',
        //   match: "^(\\w+) tells you '([^']+)'$",
        //   replace: "<span style='color:cyan'>$1</span> tells you '$2'",
        //   time: true,
        //   scroll: true,
        // },
      ],
    });
  }
});

/* Havoc Websocket rich-text UI customizations. Included when &havoc is set in the URL */

import jQuery from 'jquery';
import { Event } from './event.js';
import { config } from './config.js';
import { ScrollView } from './scroll-view.js';
import { MistyBars } from './misty-bars.js';
import { Modal } from './modal.js';
import { Toolbar } from './toolbar.js';
import { log, stringify } from './utils.js';

const j = jQuery;

class Havoc {
  constructor() {
    if (!config.havoc) return;

    config.port = config.port.length ? config.port : 6001;
    config.proxy = `wss://${config.host}:${config.port}/`;
    config.fbAppId = config.fbAppId || config.fb;
    config.bare = 1;
    config.nocore = 1;
    config.base64 = 1;
    config.debug = 1;
    config.notrack = 1;
    config.triggers = false;
    config.macros = false;

    Event.listen('socket_open', () => {
      config.Socket.write('{ portal: 1 }');
    });

    if (!config.gui) {
      config.ScrollView = new ScrollView();

      if (config.misty) {
        config.MistyBars = new MistyBars({
          process: (d) => this.processMistyBars(d),
        });
      }
    }

    Event.listen('socket_close', () => {
      new Modal({
        title: 'Server Disconnected',
        text: "Lost server connection. This is normal if you're navigating away or connecting from elsewhere. If not, usually, this means a server boot / update. Please reload the page to make sure you have the latest app code.<br><br>",
        backdrop: 'static',
        closeable: 0,
        buttons: [
          {
            text: 'Reload',
            click: () => {
              window.onbeforeunload = () => {};
              window.location.reload();
            },
          },
        ],
      });
    });

    if (!config.gui) {
      j(document).ready(() => {
        config.Toolbar = new Toolbar();
        Event.listen('window_open', config.Toolbar.update);
        Event.listen('window_close', config.Toolbar.update);
        Event.listen('window_front', config.Toolbar.front);
      });

      Event.listen('mxp_frame', (name, action) => {
        if (name === 'syslog' && action === 'open') {
          j('#syslog').css({
            width: 400,
            height: 150,
            left: config.width,
            top: 800,
            fontSize: 12,
          });
        }
      });
    }
  }

  processMistyBars(d) {
    try {
      const key = d.match(/([^ ]+?) /)[1];
      const value = d.match(/[^ ]+? (.*)/)[1];

      if (!key.startsWith('ch.points')) return d;

      let p = eval('(' + value + ')');
      if (p.points) p = p.points;

      window.cm = {
        maxhp: p.maxhit || window.cm.maxhp,
        maxmana: p.maxmana || window.cm.maxmana,
        maxmoves: p.maxstamina || window.cm.maxmoves,
      };

      window.cv = {
        hp: p.hit,
        mana: p.mana,
        moves: p.stamina,
      };

      window.cs = {
        tnl: -1,
        exp: p.exp || 'N/A',
        enemy: p.enemy || 'N/A',
        enemypct: p.enemypct || 0,
      };

      window.redraw();
      log('MistyBars override: ' + stringify(p));
    } catch (err) {
      log('MistyBars override gmcp parse error: ' + err);
    }

    return d;
  }
}

// Export Facebook class for external use
export { Havoc };

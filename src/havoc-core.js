/* eslint-disable no-undef */
// no-undef added to avoid eslint errors for global variables
// FB will be available globally after the SDK script is loaded and initialized,
// take a look below when loading a file from connect.facebook.net

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

// Facebook integration class
class Facebook {
  static init() {
    if (!config.fbAppId) return;

    log('HavocCore: Facebook.init ' + config.fbAppId);

    window.fbAsyncInit = () => {
      log('HavocCore: fbAsyncInit');
      FB.init({
        appId: config.fbAppId,
        status: true,
        cookie: true,
        xfbml: true,
        version: 'v2.1',
      });
    };

    ((d, s, id) => {
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;

      const js = d.createElement(s);
      js.id = id;
      js.src = '//connect.facebook.net/en_US/sdk.js';
      fjs.parentNode.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');

    j('body').on('show.bs.modal', () => {
      if (j('.modal.login-prompt').length) {
        j('.modal-footer').prepend(`
          <div class="left" style="opacity: 0.7; margin-right: 6px">
            <img src="/aaralon/images/FacebookButton.png" 
                 class="tip pointer" 
                 title="Log in with your Facebook account." 
                 onclick="Facebook.login();return false;">
          </div>
        `);
      }
    });
  }

  static login() {
    try {
      FB.getLoginStatus((resp) => {
        if (resp.status === 'connected') {
          Facebook.statusChange(resp);
        } else {
          FB.login((resp) => Facebook.statusChange(resp), {
            scope: 'public_profile,email',
          });
        }
      });
    } catch (ex) {
      log(ex);
    }
  }

  static checkState() {
    return FB.getLoginStatus((resp) => Facebook.statusChange(resp));
  }

  static statusChange(response) {
    log(response);
    if (response.status === 'connected') {
      FB.api('/me', (resp) => {
        if (!resp || resp.error) return;

        log(resp);

        if (window.info) {
          window.info.fb = resp;
        }

        config.Socket.write(
          stringify({
            fbid: resp.id,
            email: resp.email,
          }),
        );
      });
    }
  }
}

// GMCP event listener for Facebook integration
Event.listen('gmcp', (d) => {
  if (!d?.startsWith('game.info')) return d;

  const data = eval('(' + d.match(/[^ ]+? (.*)/)[1] + ')');

  if (data.fbAppId?.length) {
    log('HavocCore received Facebook app id from server');

    if (!config.fbAppId) {
      config.fbAppId = data.fbAppId;
      Facebook.init();
    }
  }

  return d;
});

// Export Facebook class for external use
export { Havoc, Facebook };

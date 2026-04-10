/* eslint-disable no-undef */
// no-undef added to avoid eslint errors for global variables
// FB will be available globally after the SDK script is loaded and initialized,
// take a look below when loading a file from connect.facebook.net

import jQuery from 'jquery';
import { Event } from './event.js';
import { config } from './config.js';
import { log, stringify } from './utils.js';

const j = jQuery;

// Facebook integration class
class Facebook {
  static initialize() {
    if (!config.fbAppId) return;

    log('Facebook.initialize ' + config.fbAppId);

    window.fbAsyncInit = () => {
      log('fbAsyncInit');
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
if (config.fb) {
  Event.listen('gmcp', (d) => {
    if (!d?.startsWith('game.info')) return d;

    const data = eval('(' + d.match(/[^ ]+? (.*)/)[1] + ')');

    if (data.fbAppId?.length) {
      log('HavocCore received Facebook app id from server');

      if (!config.fbAppId) {
        config.fbAppId = data.fbAppId;
        Facebook.initialize();
      }
    }

    return d;
  });
}
export { Facebook };

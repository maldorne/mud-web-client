import jQuery from 'jquery';
import { config } from './config.js';
import { Modal } from './modal.js';
import { Event } from './event.js';
import { ControlPanel } from './control-panel.js';
import { ScrollView } from './scroll-view.js';
import { Toolbar } from './toolbar.js';

const j = jQuery;

export function initializeCore() {
  if (typeof WebSocket == 'undefined') {
    new Modal({
      title: 'Incompatible Browser',
      html: 'The portal web app requires a modern browser...',
      closeText: 'Dismiss',
    });
  }

  j('body').addClass('app');

  if (config.socket) {
    window.onbeforeunload = () =>
      'Are you sure you want to disconnect and leave this page?';
  }

  if (config.embed) j('body#page').css({ background: 'transparent' });

  j(document).ready(function () {
    if (config.bare || config.clean) {
      j('#header').remove();
      j('#maininner #content').attr('id', 'app-content');
    } else {
      j('#header')
        .css({
          opacity: 0.4,
          zIndex: 0,
        })
        .on('click', function () {
          j(this).css('opacity', 1);
        });
    }

    if (config.embed) {
      Event.listen('scrollview_ready', function () {
        j('.ui-resizable-handle').css({ opacity: 0 });
        j('.icon-minus').remove();
      });
    }
  });

  if (config.device.touch) {
    document.ontouchmove = function (e) {
      e.preventDefault();
    };
    j('head').append(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />\
			<meta name="apple-mobile-web-app-capable" content="yes">',
    );

    j('head').append(
      '<link rel="apple-touch-startup-image" sizes="640x1136" href="/images/app-splash-5.png">',
    );
    j('head').append(
      '<link rel="apple-touch-startup-image" sizes="640x960" href="/images/app-splash-4.png">',
    );
  }

  if (!config.nocore) {
    if (!config.nocenter) config.ControlPanel = new ControlPanel();

    if (config.host && config.port) {
      new ScrollView({
        local: true,
        css: {
          width: config.width,
          height: config.height,
          top: config.top,
          left: config.left,
          zIndex: 103,
        },
        scrollback: 40 * 1000,
      });

      if (!config.embed && !config.device.mobile && !config.kong) {
        config.Toolbar = new Toolbar().init().update();
      }
    }

    if (
      window.user &&
      window.user.guest &&
      !config.kong &&
      !config.device.touch
    )
      j('.app').prepend(
        '<a class="right" style="opacity:0.5;margin-right: 8px" \
          href="/component/comprofiler/login" target="_self">\
          <i class="icon-sun"></i> login</a>',
      );

    if (config.kong) config.ScrollView.title('Bedlam');
  }

  j(document).on('click', 'a[data-toggle="tab"]', function (e) {
    j(this).find('.badge').remove();
  });

  if (!config.device.touch) {
    j('body').tooltip({
      items: '.tip', // Elements that trigger the tooltip
      tooltipClass: 'ui-tooltip', // Add custom class for styling
      position: {
        my: 'center bottom-10',
        at: 'center top',
        collision: 'flipfit',
      },
      show: {
        effect: 'fadeIn',
        duration: 200,
      },
      hide: {
        effect: 'fadeOut',
        duration: 100,
      },
      content: function () {
        return j(this).prop('title');
      },
    });
  }
}

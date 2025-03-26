import jQuery from 'jquery';
import { saveAs } from 'file-saver';
import 'jquery-ui-dist/jquery-ui';
import 'jquery.nicescroll';
import './lib/fortawesome.js';

import { Config } from './config.js';
import { Event } from './event.js';
import { Window } from './window.js';
import { Modal } from './modal.js';
import { Socket } from './socket.js';
import { Colorize } from './colorize.js';
import { MacroPane } from './macro-pane.js';
import { TriggerHappy } from './trigger-happy.js';
import { log } from './utils.js';

const j = jQuery;

export class ScrollView {
  constructor(options = {}) {
    this.options = {
      css: {
        width: Config.width,
        height: Config.height,
        top: Config.top,
        left: Config.left,
      },
      local: 1 /* local echo */,
      scrollback: 30 * 1000,
      ...options,
    };

    this.id = '#scroll-view';
    this.ws = {};
    this.sesslog = '';
    this.freeze = null;
    this.mobile = Config.device.mobile;
    this.touch = Config.device.touch;
    this.multi = null;
    this.cmds = [];
    this.cmdi = 0;
    // this.echo = true;
    this.keepcom = Config.getSetting('keepcom') ?? true;

    if (Config.kong) {
      this.options.css.height = j(window).height() - 3;
    }

    this.options.local =
      Config.getSetting('echo') == null || Config.getSetting('echo') == true;
    this.options.echo = this.options.echo || true;

    this.initializeWindow();
    this.setupButtons();
    this.setupContent();
    this.setupEventListeners();
    this.initializeSocket();

    // return this.createInterface();
  }

  initializeWindow() {
    this.win = new Window({
      id: this.id,
      css: this.options.css,
      class: 'scroll-view nofade',
      master: !Config.notrack,
      closeable: Config.ControlPanel,
    });

    if (this.mobile) {
      j('#page').css({
        background: 'none no-repeat fixed 0 0 #000000',
        margin: '0px auto',
      });

      j('body').css({
        width: '100%',
        height: '100%',
        overflow: 'auto',
      });

      this.win.maximize();
    }

    if (this.touch) {
      j(this.id).css({ top: 0, left: 0 });
    }
  }

  setupButtons() {
    this.win.addButton({
      title: 'Reconnect',
      icon: 'fa-solid fa-rotate',
      click: () => {
        this.echo('Attempting to reconnect...');
        Config.socket.reconnect();
      },
    });

    this.win.addButton({
      title: 'Increase the font size',
      icon: 'fa-solid fa-magnifying-glass-plus',
      click: (e) => {
        const output = j(`${this.id} .out`);
        const fontSize = parseInt(output.css('fontSize'));
        output.css({
          fontSize: `${fontSize + 1}px`,
          lineHeight: `${fontSize + 6}px`,
        });
        output.scrollTop(output.prop('scrollHeight'));
        e.stopPropagation();
        return false;
      },
    });

    this.win.addButton({
      title: 'Decrease the font size',
      icon: 'fa-solid fa-magnifying-glass-minus',
      click: (e) => {
        const output = j(`${this.id} .out`);
        const fontSize = parseInt(output.css('fontSize'));
        output.css({
          fontSize: `${fontSize - 1}px`,
          lineHeight: `${fontSize + 4}px`,
        });
        output.scrollTop(output.prop('scrollHeight'));
        e.stopPropagation();
        return false;
      },
    });

    this.win.addButton({
      title: 'Download a session log',
      icon: 'fa-solid fa-download',
      click: (e) => {
        const blob = new Blob([this.sesslog], {
          type: 'text/plain;charset=utf-8',
        });
        saveAs(
          blob,
          `log-${Config.host}-${new Date().toISOString().split('T')[0]}.txt`,
        );
        e.stopPropagation();
        return false;
      },
    });

    this.win.addButton({
      title: 'Toggle a freezepane',
      icon: 'fa-solid fa-columns',
      click: (e) => this.toggleFreezepane(e),
    });
  }

  toggleFreezepane(e) {
    const output = j(`${this.id} .out`);
    const freezePane = j(`${this.id} .freeze`);

    if (freezePane.length) {
      try {
        this.freeze?.remove();
        freezePane.remove();
        output.width('98%');
        output.scrollTop(output.prop('scrollHeight'));
      } catch (error) {
        log(error);
      }
    } else {
      output.after(`<div class="freeze">${output.html()}</div>`);
      output.width('52%');
      this.freeze = j(`${this.id} .freeze`).niceScroll({
        cursorwidth: 7,
        cursorborder: 'none',
      });
      j(`${this.id} .freeze`).scrollTop(
        j(`${this.id} .freeze`).prop('scrollHeight'),
      );
      output.scrollTop(output.prop('scrollHeight'));
    }
    e.stopPropagation();
    return false;
  }

  setupContent() {
    const spellcheck = Config.getSetting('spellcheck');

    j(`${this.id} .tab-content`).append(`
      <div class="out nice"></div>
      <div class="input">
        <input class="send" 
               autocomplete="on" 
               autocorrect="off" 
               autocapitalize="off" 
               spellcheck="${spellcheck ? 'true' : 'false'}"
               placeholder="type a command..." 
               aria-live="polite"/>
      </div>
    `);

    if (this.mobile) {
      j(`${this.id} .out`).css({
        'font-family': 'DejaVu Sans Mono',
        'font-size': '11px',
        height: '90%',
      });
    } else {
      this.setupDesktopFeatures();
    }

    j(`${this.id} .out`).niceScroll({
      cursorwidth: 7,
      cursorborder: 'none',
      railoffset: { top: -2, left: -2 },
    });
  }

  setupDesktopFeatures() {
    const multilineId = `multiline-${Math.random().toString(36).substr(2, 9)}`;

    j(`${this.id} .input`).append(`
      <a class="kbutton multiline tip ${multilineId}" 
         title="Send multi-line text" 
         style="height: 21px;position: relative;top: 1px;display: inline-block;padding: 0px 8px !important;;">
        <i class="fa-solid fa-align-justify"></i>
      </a>
    `);

    this.setupMultilineInput();
    this.setupAutocomplete();
  }

  setupMultilineInput() {
    const handleMultiline = (e, text = '') => {
      const spellcheck = Config.getSetting('spellcheck');

      new Modal({
        title: 'Multi-Line Input',
        text:
          `<textarea class="multitext" autocorrect="off" autocapitalize="off" spellcheck="${spellcheck ? 'true' : 'false'}">` +
          text +
          '</textarea>',
        closeable: true,
        showOk: false, // Disable default OK button
        buttons: [
          {
            text: 'Send',
            handler: () => {
              const messages = j('.multitext').val().split('\n');
              messages.forEach((msg, index) => {
                setTimeout(
                  () => {
                    Config.Socket.write(msg);
                    // this.echo(msg);
                  },
                  100 * (index + 1),
                );
              });
            },
          },
          { text: 'Cancel' },
        ],
      });

      j('.modal').on('shown.bs.modal', () => {
        j('.multitext').focus();
      });

      if (e) e.stopPropagation();
      return false;
    };

    j(this.id).on('click', '.multiline', handleMultiline);
  }

  setupAutocomplete() {
    if (!Config.embed && !Config.kong) {
      j(`${this.id} .send`).autocomplete({
        appendTo: 'body',
        minLength: 2,
        source: (request, response) => {
          const uniqueCmds = [...new Set(this.cmds)];
          const results = j.ui.autocomplete.filter(uniqueCmds, request.term);
          response(results.slice(0, 5));
        },
      });
    }
  }

  setupEventListeners() {
    this.setupInputHandlers();
    this.setupColorization();
    this.setupLogging();
  }

  setupInputHandlers() {
    const input = j(`${this.id} .send`);

    if (this.mobile) {
      this.setupMobileHandlers(input);
    } else {
      this.setupDesktopHandlers(input);
    }
  }

  setupMobileHandlers(input) {
    input.focus(() => {
      j(this.id).height('82%');
      this.scroll();
    });

    input.blur(() => {
      this.win.maximize();
      this.scroll();
    });

    document.addEventListener('touchstart', () => this.scroll(), false);

    input.keydown((e) => {
      if (e.which === 13) {
        e.preventDefault();
        const value = input.val();

        if (value.length) {
          this.ws.send(value);
          input.val('');
        } else {
          this.ws.send('\r\n');
        }
      }
    });

    input.focus();
    setInterval(() => this.scroll(), 2000);
  }

  setupDesktopHandlers(input) {
    input.focus(function () {
      if (!j(this).is(':focus')) j(this).select();
    });

    input.focus().keydown((e) => {
      if (e.which === 13) {
        e.preventDefault();
        const value = input.val();

        if (value.length) {
          this.ws.send(value);
          this.cmds.push(value);
          this.cmdi++;

          if (this.keepcom) {
            input[0].select();
          } else {
            input.val('');
          }
        } else {
          this.ws.send('\r\n');
        }
      } else if (e.keyCode === 38) {
        e.preventDefault();
        if (this.cmdi) {
          input.val(this.cmds[--this.cmdi]);
        }
        input[0].select();
      } else if (e.keyCode === 40) {
        e.preventDefault();
        if (this.cmdi < this.cmds.length - 1) {
          input.val(this.cmds[++this.cmdi]);
        }
        input[0].select();
      }
    });
  }

  setupColorization() {
    Event.listen('internal_colorize', new Colorize().process);
  }

  setupLogging() {
    Event.listen('after_display', (message) => {
      try {
        this.sesslog += message.replace(/<br>/gi, '\n').replace(/<.+?>/gm, '');
      } catch (error) {
        log('ScrollView.after_display ', error);
      }
      return message;
    });
  }

  add(content) {
    const output = j(`${this.id} .out`);
    const freezePane = j(`${this.id} .freeze`);

    if (output[0].scrollHeight > this.options.scrollback) {
      output.children().slice(0, 100).remove();
      const html = output.html();
      const firstSpan = html.indexOf('<span');
      output.html(html.slice(firstSpan));
    }

    output.append(`<span>${content}</span>`);
    this.scroll();

    if (freezePane.length) {
      freezePane.append(`<span>${content}</span>`);
    }

    Event.fire('scrollview_add', content, this);
  }

  scroll() {
    j(`${this.id} .out`).scrollTop(j(`${this.id} .out`).prop('scrollHeight'));
  }

  echo(message) {
    if (!message.length) return;

    if (this.options.local && this.options.echo) {
      const escapedMessage = message
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;');

      // eslint-disable-next-line prettier/prettier
      this.add(`<span style="font-size: 12px; color: gold; opacity: 0.6">${escapedMessage}</span><br>`);
    }
  }

  title(text) {
    this.win.setTitle(text);
    document.title = text || Config.name;
  }

  initializeSocket() {
    this.title(Config.name || `${Config.host}:${Config.port}`);

    this.ws = new Socket({
      host: Config.host,
      port: Config.port,
      proxy: Config.proxy,
      out: this,
    });

    if (window.user?.id) {
      this.setupMacrosAndTriggers();
    }

    Config.ScrollView = this;
    Event.fire('scrollview_ready', null, this);
  }

  setupMacrosAndTriggers() {
    Config.MacroPane = new MacroPane({ socket: this.ws });
    Config.TriggerHappy = new TriggerHappy({ socket: this.ws });

    if (!Config.nomacros) {
      Event.listen('before_send', Config.MacroPane.sub);
      this.echo('Activating macros.');
    }

    if (!Config.notriggers) {
      Event.listen('after_display', Config.TriggerHappy.respond);
      this.echo('Activating triggers.');
    }
  }

  echoOff = () => (this.options.echo = false);
  echoOn = () => (this.options.echo = true);

  // createInterface() {
  //   return {
  //     add: (content) => this.add(content),
  //     echo: (message) => this.echo(message),
  //     echoOff: () => (this.options.echo = false),
  //     echoOn: () => (this.options.echo = true),
  //     title: (text) => this.title(text),
  //     id: this.id,
  //     scroll: () => this.scroll(),
  //     win: this.win,
  //   };
  // }
}

import jQuery from 'jquery';
import { config } from './config.js';
import { Window } from './window.js';
import { log, stringify, param } from './utils.js';
import { Event } from './event.js';

const j = jQuery;

export class MacroPane {
  constructor(options = {}) {
    if (!config.macros) return;

    this.id = '#macro-pane';
    this.socket = config.socket;
    this.host = config.host;
    this.port = config.port;
    this.buttons = [];
    this.first = true;

    const { sitelist: G, profiles: P } = window.user.pref;
    this.gMacros = null;
    this.pMacros = null;

    // Find game macros
    for (const game of Object.values(G)) {
      if (game.host === this.host) {
        this.gMacros = game.macros;
        break;
      }
    }

    // Find profile macros
    if (P && P[param('profile')]) {
      this.pMacros = P[param('profile')].macros;
    }

    this.exposeToConfig();
  }

  initialize() {
    let hasFavorites = false;
    this.buttons = [];

    if (this.gMacros) {
      this.gMacros.forEach((macro) => {
        this.buttons.push(macro);
        if (macro[3]) hasFavorites = true;
      });
    }

    if (this.pMacros) {
      this.pMacros.forEach((macro) => {
        this.buttons.push(macro);
        if (macro[3]) hasFavorites = true;
      });
    }

    this.socket.echo(`Loaded ${this.buttons.length} macros.`);

    // if (hasFavorites && !this.options?.noquickbuttons && !config.nocenter) {
    if (hasFavorites && !this.options?.noquickbuttons) {
      this.createPane();
    }

    this.first = false;
  }

  createPane() {
    if (config.device.mobile) return;

    j(this.id).remove();

    if (!this.buttons.length) return;

    this.win = new Window({
      id: this.id,
      title: 'Quick Buttons',
      closeable: true,
      class: 'nofade',
      css: {
        width: 200,
        height: 400,
        top: 160,
        left: j(window).width() - 220,
        zIndex: 4,
      },
    });

    j(`${this.id} .content`).append('<ul class="macro-btns"></ul>');

    this.buttons.forEach(([name, command, enabled, favorite]) => {
      if (enabled && favorite && !command.includes('$')) {
        j(`${this.id} .content .macro-btns`).append(`
          <li class="kbutton macro-btn tip" 
              data="${command}" 
              title="${command}">
            ${name}
          </li>
        `);
      }
    });

    if (this.first) {
      j(`${this.id} .content .macro-btns`).sortable();
      j('body').on('click', '.macro-btn', (e) => {
        this.socket.send(j(e.currentTarget).attr('data'));
      });
    }
  }

  replaceVariables(message) {
    return this.buttons.reduce((msg, [name, value, enabled]) => {
      if (name[0] === '$' && enabled) {
        const regex = new RegExp('\\' + name, 'g');
        log(regex);
        const replacedMsg = msg.replace(regex, value);
        log(
          `MacroPane: var replacement: ${stringify([name, value, enabled])}`,
        );
        log(replacedMsg);
        return replacedMsg;
      }
      return msg;
    }, message);
  }

  processCommand(message) {
    if (!config.macros) return message;

    log(`MacroPane.sub: ${this.buttons.length}`);

    for (const [command, substitution, enabled] of this.buttons) {
      if (!enabled || !message.includes(command)) continue;

      if (!substitution.includes('$')) {
        const regex = new RegExp('^' + command, 'g');
        return message.replace(regex, substitution);
      }

      if (substitution.includes('$*')) {
        const [, ...args] = message.split(' ');
        return substitution.replace('$*', args.join(' '));
      }

      if (!substitution.includes(' ')) continue;

      const messageArgs = message.split(' ');
      if (messageArgs[0] !== command) continue;

      let result = substitution;
      messageArgs.slice(1).forEach((arg, index) => {
        result = result.replace(`$${index + 1}`, arg, 'g');
        log(result);
      });

      return this.replaceVariables(result);
    }

    return message;
  }

  // static create(options) {
  //   const pane = new MacroPane(options);
  //   return {
  //     init: () => pane.init(),
  //     pane: () => pane.createPane(),
  //     sub: (msg) => pane.processCommand(msg)
  //   };
  // }

  sub = (msg) => {
    return this.processCommand(msg);
  };

  exposeToConfig() {
    config.MacroPane = this;
    setTimeout(() => {
      Event.fire('macropane_ready', this);
    }, 500);
  }
}

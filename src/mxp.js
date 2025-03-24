import jQuery from 'jquery';
import { Config } from './config.js';
import { Event } from './event.js';
import { Colorize } from './colorize.js';
import { Window } from './window.js';
import { Modal } from './modal.js';
import { log } from './utils.js';

const j = jQuery;

export class MXP {
  constructor() {
    this.enabled = false;
    this.elements = [];
    this.entities = [];

    this.setupEventListeners();
  }

  setupEventListeners() {
    j('body').on('click', '.mxp', this.handleMxpClick);
    j('body').on('click', this.handleBodyClick);
  }

  handleMxpClick = (evt) => {
    j('.mxp-dropdown').remove();
    const href = j(evt.currentTarget).attr('href');

    if (href) {
      if (href.includes('|')) {
        this.handleMultiChoice(href, evt.currentTarget);
      } else if (href === '#') {
        Config.socket.write('');
      } else {
        Config.socket.write(href);
      }
    } else {
      Config.socket.write(j(evt.currentTarget).text());
    }

    return false;
  };

  handleBodyClick = (evt) => {
    if (!j(evt.target).is('a')) {
      j('.mxp-dropdown').remove();
    }
  };

  handleMultiChoice(options, source) {
    const choices = options.split('|');
    const hints = j(source).attr('hint')?.includes('|')
      ? j(source).attr('hint').split('|')
      : [];

    log(choices);

    j('.mxp-dropdown').remove();
    j('body').append('<ul class="mxp-dropdown"></ul>');

    choices.forEach((choice, index) => {
      const displayText = (hints[index + 1] || choice).replace(/[0-9]/g, '');
      j('.mxp-dropdown').append(`
        <li>
          <a class="mxp" href="${choice}">${displayText}</a>
        </li>
      `);
    });

    j('.mxp-dropdown').css({
      top: j(source).offset().top,
      left: j(source).offset().left + j(source).width() + 5,
      position: 'absolute',
    });

    j('input').on('mouseover', () => j('.mxp-dropdown').remove());
  }

  prep(text) {
    return text
      .replace(/\x1b\[[1-7]z/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, '<br>')
      .replace(/\x1b>/g, '>')
      .replace(/\x1b</g, '<');
  }

  process(text) {
    if (!text) return text;

    if (text.includes('\xff\xfa\x5b\xff\xf0')) {
      log('Got IAC SB MXP IAC SE -> BEGIN MXP');
      text = text.replace(/.\xff\xfa\x5b\xff\xf0/, '');
      if (!this.enabled) {
        j('body').append('<div id="mxpf" style="display: none"></div>');
        this.enabled = true;
      }
    }

    if (text.includes('\xff\xfb\x5b')) {
      console.log('Got IAC WILL MXP -> BEGIN MXP');
      text = text.replace(/.\xff\xfb\x5b/, '');
      if (!this.enabled) {
        j('body').append('<div id="mxpf" style="display: none"></div>');
        this.enabled = true;
      }
    }

    if (!this.enabled && !text.match(/\x1b\[[0-7]z/)) return text;

    text = this.processElements(text);
    text = this.processEntities(text);
    text = this.processDeclaredElements(text);
    text = this.processColorTags(text);
    text = this.processLinks(text);
    text = this.processFontTags(text);
    text = this.processImageTags(text);
    text = this.processBasicTags(text);
    text = this.processFrames(text);

    return this.cleanupTags(text);
  }

  processElements(text) {
    const elementMatch = text.match(/<!element ([^]+?)>/gi);
    if (elementMatch?.length) {
      this.elements = elementMatch.slice(1).map((element) => {
        const [name, flag, ...rest] = element
          .substring(10, element.length - 1)
          .split(' ');

        if (flag === 'FLAG=""') {
          return [
            name,
            flag,
            new RegExp(`<(${name})>([^]+?)/</${name}>`, 'gi'),
            '\x1b<a class="mxp" href="$1 $2"\x1b>$2\x1b</a\x1b>',
          ];
        }

        return [name, flag, new RegExp(`<(|/)${name}>`, 'gi'), ''];
      });

      Event.fire('mxp_elements', this.elements);
      text = text.replace(/<!element[^]+>/gi, '');
    }
    return text;
  }

  // ... rest of processing methods following same pattern

  translate(text) {
    return this.prep(this.process(text));
  }

  isEnabled() {
    return this.enabled;
  }

  disable() {
    this.enabled = false;
  }
}

// Initialize MXP if enabled in settings
if (Config.getSetting('mxp') ?? true) {
  Config.mxp = new MXP();
  Event.listen('internal_mxp', (text) => Config.mxp.process(text));
} else {
  log('MXP disabled in profile or game preferences.');
}

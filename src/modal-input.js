import jQuery from 'jquery';
import { Modal as BootstrapModal } from 'bootstrap';
import { Config } from './config.js';
import { Event } from './event.js';
import { Colorize } from './colorize.js';
import { log, stringify, exists } from './utils.js';

const j = jQuery;

export class ModalInput {
  constructor(options) {
    this.options = options;
    this.colorize = new Colorize();
    this.modalInstance = null;
    this.init();
  }

  close(send = false) {
    log('ModalInput close');

    if (!send) {
      Config.Socket.write(this.options.abort);
    }

    this.cleanupEventListeners();
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  send() {
    const msg = j('.modal .me-input').val();

    if (j('.modal .me-pass2').length) {
      Config.Socket.write(
        stringify({
          password1: msg,
          password2: j('.modal .me-pass2').val(),
        }),
      );
    } else {
      const { before = '', after = '' } = this.options;
      Config.Socket.write(before + msg + after);
    }

    this.close(true);
  }

  cleanupEventListeners() {
    j('.modal .me-dismiss').off();
    j('.modal .me-send').off();
    j('.modal .me-second').off();
  }

  init() {
    const o = this.options;
    o.backdrop = o.backdrop || false;

    if (o.close && o.close === 1) {
      this.close();
      return;
    }

    if (o.mxp) {
      o.replace = 1;
      o.mxp = Config.mxp.translate(o.mxp);
      o.intro = o.intro ? o.mxp + o.intro : o.mxp;
    }

    if (o.text) {
      o.text = this.colorize.strip(o.text).replace(/\r/g, '');
    }

    if (o.error) o.error = Config.mxp.prep(o.error);
    if (o.info) o.info = Config.mxp.prep(o.info);
    if (o.intro) o.intro = Config.mxp.prep(o.intro);

    if (o.replace && j('.me-modal').length && j('.me-modal').is(':visible')) {
      j('.modal h3').html(o.title);
      j('.modal .modal-body').html(o.text || o.html);
      return;
    }

    // Remove existing modals
    const existingModal = j('.modal');
    if (existingModal) {
      const modal = BootstrapModal.getInstance(existingModal);
      if (modal) modal.hide();
      existingModal.remove();
    }

    const modalTemplate = `
      <div class="modal ${o['class'] || ''} fade me-modal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${o.title || 'Multi-Line Input'}</h5>
              ${
                o.closeable !== false
                  ? '<button type="button" class="btn-close me-dismiss" data-bs-dismiss="modal" aria-label="Close"></button>'
                  : ''
              }
            </div>
            <div class="modal-body">
              ${o.info ? `<div class="alert alert-info">${o.info}</div>` : ''}
              ${o.error ? `<div class="alert alert-danger">${o.error}</div>` : ''}
              ${o.intro ? `<div class="intro">${o.intro}</div><br>` : ''}
              ${
                o.tag
                  ? `<input type="${o.type || 'text'}" 
                  class="me-input ${o.text ? 'modal-text-content' : ''}"
                  spellcheck="false"
                  autocapitalize="off"
                  autocorrect="off"
                  placeholder="${o.placeholder || ''}"
                  value="${o.text || ''}">`
                  : `<textarea 
                  class="me-input ${o.text ? 'modal-text-content' : ''}"
                  spellcheck="false"
                  autocapitalize="off"
                  autocorrect="off"
                  placeholder="${o.placeholder || ''}">${o.text || o.html || ''}</textarea>`
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary kbutton me-dismiss">
                ${o.closeText || 'Cancel'}
              </button>
              <button class="btn btn-primary kbutton me-send">
                ${o.sendText || 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    j('body').append(modalTemplate);

    this.setupPasswordReset();
    this.setupInputStyles();
    this.setupButtons();
    this.setupEventListeners();

    // Initialize Bootstrap modal
    const modalEl = document.querySelector('.modal');
    this.modalInstance = new BootstrapModal(modalEl, {
      backdrop: o.backdrop ? true : 'static',
      keyboard: true,
    });

    if (o.css) {
      if (o.css.width) {
        o.css['margin-left'] = -(o.css.width / 2);
      }
      j('.modal').css(o.css);
    }

    this.modalInstance.show();

    setTimeout(() => {
      j('.modal textarea').focus();
    }, 500);
  }

  setupPasswordReset() {
    const o = this.options;
    if (o.attr && (o.attr === 'reset' || o.attr === 'change')) {
      j('.modal-body').append(`
        <br>
        <input type="password" class="me-pass2" placeholder="re-enter password">
      `);

      j('.modal .me-send').addClass('disabled');

      j('.modal input').on('keyup', () => {
        const pass1 = j('.modal .me-input').val();
        const pass2 = j('.modal .me-pass2').val();

        j('.modal .me-send').toggleClass(
          'disabled',
          !(pass1.length > 5 && pass2.length > 5 && pass1 === pass2),
        );
      });
    }
  }

  setupInputStyles() {
    const o = this.options;
    if (o.tag && o.tag === 'input') {
      j('.modal-body').css({ padding: 30 });
      j('.modal input').width(300);

      if (!o.intro || o.intro.length < 60) {
        o.css = { ...o.css, width: 400 };
      }
    }
  }

  setupButtons() {
    const o = this.options;
    if (!o.buttons) return;

    j('.modal-footer .kbutton').remove();

    o.buttons.forEach((button, index) => {
      const buttonClass =
        !button.click && !exists(button.send) ? ' me-send' : '';

      j('.modal-footer').prepend(`
        <button class="btn btn-secondary kbutton custom-${index}${buttonClass}">
          ${button.text}
        </button>
      `);

      if (button.send) {
        j('.modal-footer .custom-' + index).click(() => {
          Config.Socket.write(button.send);
        });
      }

      if (button.click) {
        j('.modal-footer .custom-' + index).click(button.click);
      }

      if (button.css) {
        j('.modal-footer .custom-' + index).css(button.css);
      }
    });
  }

  setupEventListeners() {
    j('.modal .me-send').on('click', () => this.send());
    j('.modal .me-dismiss').on('click', () => this.close());

    if (this.options.sendText) {
      j('.modal .me-send').text(this.options.sendText);
    }
  }
}

// GMCP event listener
Event.listen('gmcp', (data) => {
  if (!data?.length || !data.startsWith('ModalInput')) return data;

  log('ModalInput detected gmcp trigger');

  try {
    const options = JSON.parse(data.match(/^[^ ]+ (.*)/)[1]);
    options.replace = options.gmcp = 1;
    new ModalInput(options);
  } catch (error) {
    log('ModalInput parse error:', error);
  }

  return data;
});

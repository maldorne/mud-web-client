import jQuery from 'jquery';
import { Modal as BootstrapModal } from 'bootstrap';
import { Config } from './config.js';
import { Event } from './event.js';
import { log } from './utils.js';

const j = jQuery;

export class Modal {
  constructor(options) {
    log('Modal.init');
    this.options = options;
    this.options.backdrop = options.backdrop || false;
    this.modalInstance = null;
    this.init();
  }

  close() {
    log('Modal.close');

    if (this.options.abort) {
      Config.Socket.write(this.options.abort);
    }

    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  init() {
    const o = this.options;

    if (o.close && o.close === 1) {
      const existingModal = document.querySelector('.modal');
      if (existingModal) {
        const modal = BootstrapModal.getInstance(existingModal);
        if (modal) modal.hide();
      }
      return;
    }

    if (o.mxp) {
      o.replace = 1;
      o.mxp = Config.mxp.translate(o.mxp);
      o.text = o.text ? o.mxp + o.text : o.mxp;
    }

    if (o.text) o.text = Config.mxp.prep(o.text);
    if (o.error) o.error = Config.mxp.prep(o.error);
    if (o.info) o.info = Config.mxp.prep(o.info);

    if (o.monospace !== undefined && !o.monospace) {
      o.html = o.text;
      delete o.text;
      log('monospace option is false');
    }

    /* try to update the contents of an already existing modal */
    if (o.replace) {
      if (j('.modal-plain').length && j('.modal').is(':visible')) {
        log('modal (simple) found in replace mode');
        j('.modal h3').html(o.title);
        j('.modal .modal-body').html(o.text || o.html);

        this.setupButtons();
        this.setupLinks();
        return;
      }
    }

    // Hide any existing modals
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
      const modal = BootstrapModal.getInstance(existingModal);
      if (modal) modal.hide();
    }

    const modalTemplate = `
      <div class="modal ${o['class'] || ''} modal-plain fade" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${o.title || ''}</h5>
              <button type="button" class="btn-close mo-dismiss" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${o.info ? `<div class="alert alert-info">${o.info}</div>` : ''}
              ${o.error ? `<div class="alert alert-danger">${o.error}</div>` : ''}
              ${o.text ? `<div class="modal-text-content">${o.text}</div>` : o.html || ''}
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary kbutton dismiss mo-dismiss" data-bs-dismiss="modal">OK</button>
            </div>
          </div>
        </div>
      </div>
    `;

    j('body').append(modalTemplate);

    this.setupButtons();
    this.setupLinks();

    if (o.closeText || o.cancelText) {
      j('.modal .dismiss').html(o.closeText || o.cancelText);
    }

    if (o.closeable === false || o.closeable === 0) {
      j('.modal .btn-close').remove();
    }

    // Initialize Bootstrap 5 modal
    const modalEl = document.querySelector('.modal');
    this.modalInstance = new BootstrapModal(modalEl, {
      backdrop: this.options.backdrop ? true : 'static',
      keyboard: true,
    });

    j('.modal .mo-dismiss').on('click', () => this.close());

    if (o.css) {
      if (o.css.width) {
        o.css['margin-left'] = -(o.css.width / 2);
      }
      j('.modal').css(o.css);
    }

    this.modalInstance.show();
  }

  setupButtons() {
    const o = this.options;
    if (!o.buttons) return;

    j('.modal-footer .btn').not('.dismiss').remove();

    if (Array.isArray(o.buttons)) {
      o.buttons.forEach((button, index) => {
        const buttonEl = `
          <button class="btn btn-secondary kbutton custom-${index}"
            ${button.keep ? '' : 'data-bs-dismiss="modal"'}>
            ${button.text}
          </button>
        `;
        j('.modal-footer').append(buttonEl);

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
    } else {
      Object.entries(o.buttons).forEach(([text, cmd], index) => {
        const buttonEl = `
          <button class="btn btn-secondary kbutton custom-${index}" 
            data-bs-dismiss="modal">
            ${text}
          </button>
        `;
        j('.modal-footer').append(buttonEl);
        j('.modal-footer .custom-' + index).click(() => {
          Config.Socket.write(cmd);
        });
      });
    }
  }

  setupLinks() {
    const o = this.options;
    if (!o.links) return;

    j('.modal-footer .modal-links').remove();
    j('.modal-footer').prepend(`
      <div class="modal-links float-start" 
           style="position: relative; z-index: 1; font-size: 11px; opacity: 0.7">
      </div>
    `);

    if (Array.isArray(o.links)) {
      o.links.forEach((link, index) => {
        j('.modal-links').append(`
          <a class="link-${index}" 
             ${link.keep ? '' : 'data-bs-dismiss="modal"'}>
            ${link.text}
          </a><br>
        `);
        j('.modal-links .link-' + index).click(link.click);
        if (link.css) j('.modal-links .link-' + index).css(link.css);
      });
    } else {
      Object.entries(o.links).forEach(([text, cmd], index) => {
        j('.modal-links').append(`
          <a class="link-${index}" data-bs-dismiss="modal">
            ${text}
          </a><br>
        `);
        j('.modal-links .link-' + index).click(() => {
          Config.Socket.write(cmd);
        });
      });
    }
  }
}

// Bootstrap 5 Event handlers
document.addEventListener('shown.bs.modal', () => {
  j('.modal .modal-body').niceScroll({
    cursorborder: 'none',
    cursorwidth: 7,
  });
});

document.addEventListener('hide.bs.modal', () => {
  j('.modal .modal-body').getNiceScroll().remove();
  j('.modal a, .modal button').off('click');
  j('.modal input, .modal textarea').off('keydown');
  j('.modal, .modal-backdrop').remove();
});

// GMCP event listener
Event.listen('gmcp', (data) => {
  if (!data?.startsWith('Modal ')) return data;

  log('Modal: gmcp trigger');

  try {
    const options = JSON.parse(data.match(/^[^ ]+ (.*)/)[1]);
    new Modal(options);
  } catch (error) {
    log('Modal parse error:', error);
  }

  return data;
});

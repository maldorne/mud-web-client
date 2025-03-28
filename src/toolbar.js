import jQuery from 'jquery';
import { Event } from './event.js';

const j = jQuery;

export class Toolbar {
  constructor() {}

  initialize() {
    // Check if toolbar already exists
    if (!j('#tmp-toolbar').length) {
      j('body').append('<div id="tmp-toolbar" class="tmp-toolbar"></div>');
    }

    j('#tmp-toolbar').on('click', 'button', (e) => {
      e.stopPropagation();

      const target = j(e.target).attr('href');
      // Check if window still exists
      if (!j(target).length) {
        // Window was closed, remove button
        j(e.target).remove();
        return;
      }

      const win = j(target).get(0).win;
      const button = j(e.target);

      if (button.hasClass('active')) {
        win.hide();
        button.removeClass('active').addClass('disabled');
      } else if (button.hasClass('disabled')) {
        win.show();
        button.removeClass('disabled').addClass('active');
      } else {
        win.bringToFront();
        j('#tmp-toolbar button').removeClass('active');
        button.addClass('active');
      }
    });

    // Event listeners - Make update async to ensure DOM is updated
    Event.listen('window_open', () => setTimeout(() => this.update(), 0));
    Event.listen('window_close', () => setTimeout(() => this.update(), 0));
    Event.listen('window_show', () => setTimeout(() => this.update(), 0));
    Event.listen('window_hide', () => setTimeout(() => this.update(), 0));
    Event.listen('window_front', (id) => this.front(id));

    return this;
  }

  update() {
    j('#tmp-toolbar').empty();

    j('.window').each(function () {
      const $window = j(this);
      const id = $window.attr('id');
      const title = $window.get(0).win.setTitle() || id;

      const button = `
        <button href="#${id}" class="btn kbutton">
          ${title}
        </button>
      `;

      j('#tmp-toolbar').append(button);

      if (!$window.is(':visible')) {
        j('#tmp-toolbar .btn:last').addClass('disabled');
      }
    });

    return this;
  }

  front(windowSelector) {
    j('#tmp-toolbar button').removeClass('active');
    j(`#tmp-toolbar button[href="${windowSelector}"]`).addClass('active');
  }
}

// Example usage:
// import { Toolbar } from './toolbar.js';
// const toolbar = new Toolbar();

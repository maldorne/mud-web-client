import jQuery from 'jquery';
import { Event } from './event.js';

const j = jQuery;

export class Toolbar {
  constructor() {
    this.init();
  }

  init() {
    j('body').append('<div id="tmp-toolbar" class="tmp-toolbar"></div>');

    j('#tmp-toolbar').on('click', 'button', (e) => {
      e.stopPropagation();

      const target = j(e.target).attr('href');
      const win = j(target).get(0).win;
      const button = j(e.target);

      if (button.hasClass('active')) {
        win.hide();
        button.removeClass('active').addClass('disabled');
      } else if (button.hasClass('disabled')) {
        win.show();
        button.removeClass('disabled').addClass('active');
      } else {
        win.front();
        j('#tmp-toolbar button').removeClass('active');
        button.addClass('active');
      }
    });

    // Event listeners
    Event.listen('window_open', this.update.bind(this));
    Event.listen('window_close', this.update.bind(this));
    Event.listen('window_show', this.update.bind(this));
    Event.listen('window_hide', this.update.bind(this));
    Event.listen('window_front', this.front.bind(this));

    return this;
  }

  update() {
    j('#tmp-toolbar').empty();

    j('.window').each(function () {
      const $window = j(this);
      const id = $window.attr('id');
      const title = $window.get(0).win.title() || id;

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

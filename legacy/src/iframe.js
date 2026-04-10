/**
 * v1.0 - 09/08/2013
 * Loads external content in an iFrame inside a UI window
 * Can be used to link to your web-based help files
 * With option to set a timer to poll and refresh the content (e. g. web-based who is online page)
 */

import jQuery from 'jquery';
import { Window } from './window.js';
// import { log } from './utils.js';

const j = jQuery;

/**
 * IFrame component that loads external content in a window
 * Can be used to link to web-based help files or dynamic content
 */
export class IFrame {
  constructor(options) {
    this.options = {
      id: '#iframe',
      title: 'IFrame',
      url: '',
      refresh: 0,
      css: {
        width: 800,
        height: 600,
        top: 0,
        right: 0,
      },
      ...options,
    };

    this.win = null;
    this.refreshTimer = null;
  }

  initialize() {
    // If window exists, just refresh URL and toggle visibility
    if (j(this.options.id).length) {
      this.updateUrl();
      j(this.options.id).toggle();
      return;
    }

    // Create new window
    this.win = new Window({
      id: this.options.id,
      title: this.options.title,
      iframe: true,
      closeable: true,
      class: 'nofade ui-iframe',
      css: this.options.css,
      onResize: () => {
        j(`${this.options.id} .content`).height(
          j(this.options.id).height() - 16,
        );
      },
      onClose: () => {
        if (this.refreshTimer) {
          clearInterval(this.refreshTimer);
        }
      },
      // handle: this.options.handle || '.ui-draggable-handle', // Element to use as drag handle
      drag: this.options.drag, // Enable dragging
      snap: this.options.snap, // Enable snapping to other windows
    });

    // Add iframe content to .content element
    j(`${this.options.id} .content`).html(`
      <div class="iframe-container" style="height: 100%; width: 100%;">
        <iframe 
          src="${this.options.url}" 
          style="overflow: hidden; height: 100%; width: 100%; padding: 0; margin: 0;" 
          frameBorder="0">
        </iframe>
      </div>
    `);

    // Set initial height
    j(`${this.options.id} .content`).height(j(this.options.id).height() - 20);

    // Setup refresh timer if needed
    if (this.options.refresh) {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }
      this.refreshTimer = setInterval(
        () => this.updateUrl(),
        this.options.refresh * 1000,
      );
    }
  }

  updateUrl() {
    j(`${this.options.id} iframe`).attr('src', this.options.url);
  }

  addButton(buttonConfig) {
    if (buttonConfig && window.sv) {
      buttonConfig.click = () => this.initialize();
      window.sv.win.button(buttonConfig);
    }
  }
}

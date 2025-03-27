import jQuery from 'jquery';
// to use draggable
import 'jquery-ui-dist/jquery-ui';
import { Tab } from 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { config } from './config.js';
import { Event } from './event.js';
import { log, stringify, param } from './utils.js';

const j = jQuery;

export class Window {
  constructor(options = {}) {
    this.options = {
      id: '#scroll-view',
      title: 'ScrollView',
      css: {
        height: 380,
        width: 380,
      },
      ...options,
    };

    this.minZ = 100;
    this.viewId = config.view;
    this.id = '';
    this.position = null;
    this.width = null;
    this.height = null;
    this.maximized = false;
    this.wasAt = null;

    this.drag =
      !config.device.mobile &&
      !param('kong') &&
      !param('gui') &&
      !param('embed') &&
      !options.nodrag &&
      !config.nodrag;

    this.doResize = !options.noresize && !param('embed') && !config.nodrag;

    this.save =
      window.user &&
      window.user.id &&
      config.host &&
      !config.kong &&
      !param('gui') &&
      !param('embed');

    this.handle = !options.handle && !options.transparent;

    this.options.closeable = options.closeable ?? this.drag;
    this.options.tabs = options.tabs || [];

    if (config.device.touch || param('gui')) {
      this.options.handle = '.none';
    }

    this.init();
    // return this.createInterface();
  }

  init() {
    const o = this.options;
    o.id = o.id.startsWith('#') ? o.id : '#' + o.id;
    this.id = o.id;

    log(`Window.init: ${this.id}`);

    this.createWindowElement();
    this.setupHandle();
    this.setTitle(o.title || '');
    this.setupTransparency();
    this.setupButtons();
    this.setupEventHandlers();
    this.setupStyles();
    this.setupResizable();
    this.setupPosition();
    this.setupTabsStructure();

    this.bringToFront(false);

    j(this.options.id).get(0).win = this;
    Event.fire('window_open', this);
  }

  createWindowElement() {
    j('.app').prepend(`
      <div id="${this.id.slice(1)}" class="window ${this.options.class || ''}" >
        <div class="content"></div>
      </div>
    `);
  }

  setupHandle() {
    if (this.handle) {
      j(this.id).prepend(`
        <div class="handle">
          <div class="title" style="width: 100%; text-align: center; text-overflow: ellipsis;">
            ${this.options.title || '&nbsp;'}
          </div>
          <div class="toolbar"></div>
        </div>
      `);
      this.options.handle = '.handle';
    } else {
      j(`${this.id} .content`).css({ top: 0 });
    }
  }

  setupTransparency() {
    if (this.options.transparent) {
      j(`${this.id} .content`).css({
        'background-color': 'transparent',
        top: 0,
      });
      j(this.id).css('border', 'none');
      this.options.handle = '.content';
    }
  }

  setupButtons() {
    if (this.options.closeable) {
      this.addButton({
        icon: 'fa-solid fa-xmark',
        title: 'Close this window',
        click: () => {
          if (this.options.onClose) this.options.onClose();
          Event.fire('window_close', j(this.id));
          j(`${this.id} .nice`).getNiceScroll().remove();
          j(this.id).remove();
        },
      });
    }
  }

  // addButton(options) {
  //   j(`${this.id} .toolbar`).prepend(`
  //     <i class="icon ${options.icon} tip" title="${options.title}"></i>
  //   `);
  //   j(`${this.id} .${options.icon}`).click(options.click);
  // }

  addButton(options) {
    const buttonId = `btn-${Math.random().toString(36).substr(2, 9)}`;
    j(`${this.id} .toolbar`).prepend(`
      <a class="toolbar-button ${buttonId} tip" title="${options.title}">
        <i class="${options.icon}"></i>
      </a>
    `);

    // Initialize Bootstrap tooltip with custom options
    j(`${this.id} .${buttonId}`).tooltip({
      container: 'body',
      placement: 'bottom',
      trigger: 'hover',
    });

    j(`${this.id} .${buttonId}`).click(options.click);
  }

  setupEventHandlers() {
    j(this.id).click(() => this.bringToFront());

    this.setupDraggable();

    if (config.Toolbar) {
      j(`${this.id} .handle`).dblclick(() => this.hide());
    }
  }

  setupStyles() {
    j(this.id).css({ overflow: 'hidden' });

    if (this.options.nofront) j(this.id).addClass('nofront');
    if (this.options.nofade) j(this.id).addClass('nofade');

    j(`${this.id} .ui-resizable-handle`).css(
      'z-index',
      j(this.id).css('z-index'),
    );
  }

  setupResizable() {
    if (this.doResize) {
      j(this.id).resizable({
        minWidth: 60,
        width: 300,
        handles: 'all',
        stop: (e, ui) => {
          this.resize();
          if (this.options.onResize) this.options.onResize();
          this.savePosition();
        },
      });
    }
  }

  setupPosition() {
    const defaultPos = this.getPosition(this.options);
    j(this.id).css(this.options.css);

    if (j(`${this.id} .handle`).length) {
      j(`${this.id} .content`).height(j(this.id).height() - 28);
    }
  }

  setupDraggable(cancel = false) {
    try {
      j(this.id).draggable('destroy');
    } catch {
      // Ignore errors
    }

    if (cancel || !this.drag) {
      j(`${this.id} .ui-resizable-handle`).remove();
      return;
    }

    j(this.id).draggable({
      handle: this.options.handle,
      snap: true,
      iFrameFix: this.options.iframe ? true : false,
      start: (e, ui) => {
        this.wasAt = ui.position;
        j(this.id).css({ bottom: '', right: '' });
      },
      stop: (e, ui) => {
        if (this.options.master) {
          j('.window')
            .not('#scroll-view')
            .animate(
              {
                top: `-=${this.wasAt.top - ui.position.top}px`,
                left: `-=${this.wasAt.left - ui.position.left}px`,
              },
              () => {
                this.resize();
                this.savePosition();
              },
            );
          return;
        }
        this.resize();
        this.savePosition();
      },
    });
  }

  resize() {
    if (this.options.onResize) this.options.onResize();

    const height = j(this.id).height();
    const contentHeight = this.handle ? height - 18 : height;

    j(`${this.id} .content`).height(contentHeight).width(j(this.id).width());

    j(`${this.id} .tab-content`).height(
      j(this.id).height() - j(`${this.id} .nav-tabs`).height(),
    );

    j(`${this.id} .tab-pane`).each(function () {
      const $pane = j(this);
      const width = $pane.parent().width();
      const height = $pane.parent().height();
      let contentHeight = height;

      if ($pane.find('.footer')) {
        contentHeight -= $pane.find('.footer').height() + 4;
      }

      $pane.css({
        height,
        width: '100%',
      });

      $pane.find('.content').css({
        height: contentHeight,
        width: '100%',
      });
    });

    this.renice();
  }

  renice() {
    j(`${this.id} .nice`).each(function () {
      j(this).getNiceScroll().resize();
    });
  }

  bringToFront(save = true) {
    if (j(this.id).hasClass('nofront')) return;

    if (config.front === this.id) {
      Event.fire('window_front', this.id);
      return;
    }

    log(`Window.front: ${this.id}`);

    j(this.id).css('opacity', 1);

    const zIndices = [];
    const myZ = parseInt(j(this.id).css('z-index'));

    j(this.id)
      .siblings()
      .each(function () {
        if (!j(this).hasClass('window')) return;

        zIndices.push({
          id: '#' + j(this).attr('id'),
          z: parseInt(j(this).css('z-index')),
        });

        if (!j(this).hasClass('nofade')) {
          j(this).css('opacity', 0.3);
        }
      });

    if (!zIndices.length) {
      return log('solo window. no front needed');
    }

    zIndices.sort((a, b) => a.z - b.z);
    zIndices.push({ id: this.id, z: 0 });

    zIndices.forEach((item, index) => {
      j(item.id).css('z-index', this.minZ + index);
    });

    config.front = this.id;

    log(`Window.front(ed): ${this.id}`);
    Event.fire('window_front', this.id);

    if (save) this.savePosition();
  }

  savePosition() {
    if (!this.save) return;

    if (!window.user.pref.win) window.user.pref.win = {};
    if (!window.user.pref.win[this.viewId])
      window.user.pref.win[this.viewId] = {};

    j('.window').each((_, element) => {
      const $window = j(element);
      const id = $window.attr('id');
      const offset = $window.offset();

      const windowState = {
        offset,
        width: $window.width(),
        height: $window.height(),
        zIndex: parseInt($window.css('z-index')),
        opacity: parseFloat($window.css('opacity')),
        collapsed: $window.is(':visible') ? 0 : 1,
      };

      window.user.pref.win[this.viewId]['#' + id] = windowState;
      log(`Saving window position: #${id} ${stringify(windowState)}`);
    });

    j.post('?option=com_portal&task=set_pref', {
      pref: stringify(window.user.pref),
    });
  }

  getPosition(options) {
    if (!this.save || !window.user.id || !window.user.pref?.win) return true;

    log(`Restoring saved position: ${options.id}`);

    const prefs = window.user.pref.win;
    const prefKeys = Object.keys(prefs);

    while (prefKeys.length > 20) {
      log(`Trimming window pref length: ${prefKeys.length}`);
      delete prefs[prefKeys[0]];
    }

    if (!prefs[this.viewId]?.[options.id]) {
      log(`no stored position for ${options.id}`);
      log(prefs);
      return true;
    }

    const pref = prefs[this.viewId][options.id];
    const windowWidth = j(window).width();
    const windowHeight = j(window).height();

    pref.offset.left = Math.max(
      0,
      Math.min(pref.offset.left, windowWidth - pref.width),
    );
    pref.offset.top = Math.max(
      0,
      Math.min(pref.offset.top, windowHeight - pref.height),
    );

    options.css = {
      ...options.css,
      left: pref.offset.left,
      top: pref.offset.top,
      width: pref.width || options.css.width,
      height: pref.height || options.css.height,
      zIndex: pref.zIndex || options.css.zIndex,
    };

    delete options.css.right;
    delete options.css.bottom;

    if (pref.collapsed) this.hide();

    log(stringify(options));
    return false;
  }

  addTab(tab) {
    tab.html = tab.html || '';
    const index = this.options.tabs.length;
    this.options.tabs.push(tab);

    // Check if tabs structure exists, if not create it
    if (!j(`${this.id} .content .tabs`).length) {
      this.setupTabsStructure();
    }

    // Create the new tab
    this.createTab(tab, index);

    // Initialize all tabs after DOM is updated
    this.initializeTabs();

    // Adjust sizes
    this.resize();

    return `${this.id} #tab-${index}`;
  }

  setupTabsStructure() {
    j(`${this.id} .content`).prepend(`
      <ul class="tabs nav nav-tabs"></ul>
      <div class="tab-content"></div>
    `);

    j(`${this.id} .content`).css('background-color', 'transparent');
    j(`${this.id} .tabs:hover`).css({ cursor: 'move' });

    this.options.handle = '.nav-tabs';
    this.setupDraggable();
  }

  initializeTabs() {
    // Get all tab elements
    const tabElements = document.querySelectorAll(
      `${this.id} [data-bs-toggle="tab"]`,
    );

    // Create a new Tab instance for each element
    tabElements.forEach((tabElement) => {
      // Create tab instance
      const tab = new Tab(tabElement);

      // Add click handler
      tabElement.addEventListener('click', (e) => {
        e.preventDefault();
        // Get target pane
        const targetPane = document.querySelector(
          tabElement.getAttribute('href'),
        );
        if (targetPane) {
          // Remove active class from all panes
          document.querySelectorAll(`${this.id} .tab-pane`).forEach((pane) => {
            pane.classList.remove('active', 'show');
          });
          // Add active class to target pane
          targetPane.classList.add('active', 'show');
          // Remove active class from all tabs
          tabElements.forEach((t) => t.classList.remove('active'));
          // Add active class to clicked tab
          tabElement.classList.add('active');
        }
      });
    });

    // Show first tab by default
    const firstTab = tabElements[0];
    if (firstTab) {
      const targetPane = document.querySelector(firstTab.getAttribute('href'));
      if (targetPane) {
        targetPane.classList.add('active', 'show');
        firstTab.classList.add('active');
      }
    }
  }

  createTab(tab, index) {
    const tabHtml = `
    <li class="nav-item">
      <a class="kbutton ${tab.id ? tab.id.replace('#', '') : ''}" 
         data-bs-toggle="tab" 
         href="#tab-${index}"
         role="tab"
         aria-controls="tab-${index}"
         aria-selected="${index === 0 ? 'true' : 'false'}">
        ${tab.name}
      </a>
    </li>
  `;

    // Add tab navigation
    if (!tab.after && !tab.before) {
      j(`${this.id} .nav-tabs`).append(tabHtml);
    } else if (tab.before) {
      j(tabHtml).insertBefore(
        j(`${this.options.id} .nav-tabs a:contains("${tab.before}")`).parent(),
      );
    } else {
      j(tabHtml).insertAfter(
        j(`${this.options.id} .nav-tabs a:contains("${tab.after}")`).parent(),
      );
    }

    // Add tab content
    j(`${this.options.id} .tab-content`).append(`
      <div class="tab-pane fade ${index === 0 ? 'show active' : ''} ${tab.class || ''}" 
          id="tab-${index}"
          role="tabpanel"
          aria-labelledby="tab-${index}-tab">
        ${tab.html || ''}
      </div>`);

    if (tab.scroll) {
      const tabContent = j(`${this.options.id} #tab-${index} .content`);

      // Set CSS properties before niceScroll initialization
      tabContent.css({
        height: 'inherit',
        overflow: 'hidden',
        position: 'relative', // Ensure proper positioning for niceScroll
        padding: '0 10px 10px 10px',
      });

      // Initialize niceScroll with specific settings
      tabContent.addClass('nice').niceScroll({
        cursorborder: 'none',
        preservenativescrolling: false,
        overflowx: false,
        // Force height calculation based on parent
        railoffset: { top: 0, right: 0 },
        bouncescroll: false,
      });

      // Ensure height is maintained after niceScroll initialization
      const resizeObserver = new ResizeObserver(() => {
        tabContent.css('height', 'inherit');
        tabContent.getNiceScroll().resize();
      });

      resizeObserver.observe(tabContent[0]);
    }

    // let content = j(`${this.options.id} .content`);
    // content.addClass('nice').niceScroll({
    //   cursorborder: 'none',
    // });
    // content.css({ height: 'inherit' });
  }

  dock(options) {
    const target = this.addTab(options);
    log(`request to dock window: ${options.id} -> ${target}`);

    j(options.id)
      .detach()
      .appendTo(target)
      .css({
        left: 0,
        right: 'auto',
        top: 0,
        bottom: 'auto',
        height: '100%',
        width: '100%',
        position: 'relative',
        zIndex: 'inherit',
        borderWidth: 0,
      })
      .removeClass('window');

    const win = j(options.id).get(0).win;
    win.draggable(0);
    win.resize();
    win.show();

    j(options.id).find('.icon-remove').remove();

    return target;
  }

  // createInterface() {
  //   const self = {
  //     id: this.options.id,
  //     title: (t) => this.setTitle(t),
  //     button: (o) => this.addButton(o),
  //     tab: (t) => this.addTab(t),
  //     dock: (t) => this.dock(t),
  //     front: () => this.bringToFront(),
  //     maximize: () => this.maximize(),
  //     show: () => this.show(),
  //     hide: () => this.hide(),
  //     maximized: () => this.maximized,
  //     resize: () => this.resize(),
  //     draggable: (cancel) => this.setupDraggable(cancel),
  //   };

  //   j(this.options.id).get(0).win = self;
  //   Event.fire('window_open', self);
  //   return self;
  // }

  setTitle(title) {
    if (title) {
      this.options.title = title;
      j(`${this.id} .title`).html(title);
    } else {
      return this.options.title;
    }
  }

  maximize() {
    this.position = j(this.id).position();
    this.width = j(this.id).width();
    this.height = j(this.id).height();

    const parent = j(this.id).parent();

    j(this.id).css({
      width: parent.width(),
      height: parent.height(),
      top: 0,
      left: 0,
    });

    return this;
  }

  show() {
    j(this.id).show();
    Event.fire('window_show', this.id);
    this.bringToFront();
    return this;
  }

  hide() {
    j(this.id).hide();
    Event.fire('window_hide', this.id);
    this.savePosition();
    return this;
  }

  // front() {
  //   return this.bringToFront();
  // }

  draggable(cancel) {
    return this.setupDraggable(cancel);
  }
}

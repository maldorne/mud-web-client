/*
 * ChatterBox plugin - v1.1 - 09/25/2014
 * Always included on the app page (this code is just for easy viewing)
 * Creates a tabbed window with configurable tabs.
 * Captures and redirects lines matching regex expressions to one or more tabs.
 * Ideal for comm. channels.
 * See Bedlam-ChatterBox-Init.js for example use.
 */

import { Config } from './config.js';
import { Event } from './event.js';
import { Window } from './window.js';
import { log, stringify } from './utils.js';
import jQuery from 'jquery';
import {
  Dropdown,
  Tooltip,
  Tab,
} from 'bootstrap/dist/js/bootstrap.bundle.min.js';

const j = jQuery;

export class ChatterBox {
  constructor(options = {}) {
    this.options = {
      id: '#chat-window',
      title: 'ChatterBox',
      tabs: [],
      css: {
        width: 400,
        height: 400,
        top: 0,
        left: Config.width,
      },
      ...options,
    };

    if (Config.kong) {
      this.options.css.width = 398;
      this.options.css.height = j(window).height() - 143;
    }

    this.win = new Window({
      id: this.options.id,
      title: this.options.title,
      class: 'nofade ui-group ChatterBox',
      css: this.options.css || null,
      handle: '.nav-tabs',
    });

    // Add an icon to the ScrollView window to hide/show the chat box
    if (Config.ScrollView)
      Config.ScrollView.win.addButton({
        icon: 'fa-solid fa-comments',
        title: 'Hide / show the communication tabs',
        click: () => {
          j(this.options.id).toggle();
        },
      });

    this.initializeTabs();
    this.createChannelsDropdown(
      this.options.tabs
        .filter((tab) => tab.channels)
        .flatMap((tab) => tab.channels),
    );
    this.setupChannelEvents();
    this.setupEventListeners();
    this.exposeToConfig();
  }

  initializeTabs() {
    for (const tabConfig of this.options.tabs) {
      if (tabConfig.channels) {
        tabConfig.html = tabConfig.html || '<div class="content"></div>';
      }

      if (!tabConfig.target) {
        this.win.addTab(tabConfig);
      }

      if (tabConfig.match) {
        try {
          tabConfig.re = new RegExp(tabConfig.match, 'gi');
        } catch (ex) {
          log(ex);
        }
      }
    }

    // let content = j(`${this.options.id} .content`);
    // content.addClass('nice').niceScroll({
    //   cursorborder: 'none',
    // });
    // content.css({ height: 'inherit' });
  }

  createChannelsDropdown(channels) {
    const channelsList = channels
      .map(
        (channel) =>
          `<li><a class="dropdown-item" href="#" data="${channel}">${channel}</a></li>`,
      )
      .join('');

    // there is no need to add the icon after the link, bootstrap dropdown
    // will add it automatically
    // <i class="fa-solid fa-caret-down"></i>
    let footer = `
      <div class="footer dropup" style="height: 30px">
        <div class="dropdown"
             data-toggle="tooltip"
             title="Select chat channel"
             style="float: left;">
          <a id="dropdownMenuButtonChat" href="#" 
             class="channel dropdown-toggle kbutton"
             data-bs-toggle="dropdown"
             aria-expanded="false"
             style="margin: 0 0 0 5px;position: relative;top: 0px;display: inline-block;height: 22px;padding: 0 10px !important;">
            <span class="text">${channels[0]}</span>
          </a>
          <ul class="dropdown-menu" aria-labelledby="dropdownMenuButtonChat">
            ${channelsList}
          </ul>
        </div>
        <input class="send" type="text"
               style="margin-left: 6px; margin-top: 2px; width: 260px"
               placeholder="type your chat message">
      </div>`;

    // add the footer after tab-content
    const target = this.options.id;
    const tabContent = j(`${target} .tab-content`);
    if (tabContent.length) {
      tabContent.after(footer); // Changed from append() to after()
    } else {
      j(target).append(footer);
    }
  }

  // setupTargetTab(tabConfig) {
  // }

  setupChannelEvents() {
    const target = this.options.id;

    // Initialize the dropdown after adding to DOM
    const tooltipToggle = document.querySelector(`${target} .dropdown`);
    if (tooltipToggle) {
      // Create new Bootstrap Dropdown instance with configuration
      new Tooltip(tooltipToggle, {
        container: 'body',
        trigger: 'hover',
        boundary: 'window',
        placement: 'bottom',
        title: 'Select chat channel',
        customClass: 'ui-tooltip',
      });
    }

    // Initialize the dropdown after adding to DOM
    const dropdownToggle = document.querySelector(
      `${target} .dropdown-toggle`,
    );
    if (dropdownToggle) {
      // Create new Bootstrap Dropdown instance with configuration
      const dropdown = new Dropdown(dropdownToggle, {
        autoClose: true,
        display: 'dynamic',
      });

      // Add manual toggle handler
      dropdownToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.toggle();
      });

      // Debug events
      // [
      //   'show.bs.dropdown',
      //   'shown.bs.dropdown',
      //   'hide.bs.dropdown',
      //   'hidden.bs.dropdown',
      // ].forEach((event) => {
      //   dropdownToggle.addEventListener(event, (e) => {
      //     console.log(event, e);
      //   });
      // });

      // Add click handlers for menu items
      const menu = dropdownToggle.nextElementSibling;
      if (menu) {
        menu.addEventListener('click', (e) => {
          if (e.target.classList.contains('dropdown-item')) {
            e.preventDefault();
            const text = e.target.getAttribute('data');
            dropdownToggle.querySelector('.text').textContent = text;
            dropdown.hide();
          }
        });
      }
    }

    j(target).on('keydown', 'input', (e) => {
      if (e.which === 13 && j(e.currentTarget).val().length) {
        const prefix = j(`${target} .dropdown-toggle .text`).text();
        Config.Socket.write(`${prefix} ${j(e.currentTarget).val()}`);
        j(e.currentTarget).val('');

        // Find and activate the tab corresponding to the selected channel
        const selectedChannel = prefix;
        const tabIndex = this.options.tabs.findIndex(
          (tab) => tab.channels && tab.channels.includes(selectedChannel),
        );

        if (tabIndex !== -1) {
          // Get the tab element and show it using Bootstrap 5's Tab API
          const tabElement = document.querySelector(
            `${target} .nav-tabs a[href="#tab-${tabIndex}"]`,
          );
          if (tabElement) {
            const tab = new Tab(tabElement);
            tab.show();
          }
        }

        e.stopPropagation();
        e.preventDefault();
      }
    });
  }

  process(msg) {
    // if msg is an empty string, return
    if (!msg || msg.length === 0) return;

    let currentMsg = msg;

    for (const tab of this.options.tabs) {
      if (!tab.re) continue;

      // const match = currentMsg.match(tab.re);
      // Use matchAll instead of match to get all occurrences
      const matches = [...currentMsg.matchAll(tab.re)];

      for (const match of matches) {
        if (match?.length) {
          let text = match[0];

          if (tab.replace) {
            text = match[0].replace(tab.re, tab.replace, 'gi');
          }

          // Start building the HTML content
          let htmlContent = '<div id="c"><span>';

          if (tab.time) {
            const time = new Date().toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            });
            htmlContent += `<span style="color: DarkGray; opacity: 0.6">${time}</span> `;
          }

          // Add the main text content
          htmlContent += text;

          // Process URLs in the text
          htmlContent = htmlContent.replace(
            /([^"'])(http?:\/\/[^\s\x1b"']+)/g,
            '$1<a href="$2" target="_blank">$2</a>',
          );

          // Close the spans and div
          htmlContent += '</span></div>';

          const targetEl = this.getTargetElement(tab);
          targetEl.append(htmlContent);

          // Update scroll position
          targetEl[0].scrollTop = targetEl[0].scrollHeight;

          if (tab.gag) {
            currentMsg = this.handleGag(currentMsg, match[0]);
          }
        }
      }
    }

    return currentMsg;
  }

  getTargetElement(tab) {
    if (tab.target) {
      const targetIndex = this.options.tabs.findIndex(
        (t) => t.name === tab.target,
      );
      if (targetIndex > -1) {
        return this.getContentElement(targetIndex);
      }
    }
    const index = this.options.tabs.indexOf(tab);
    return this.getContentElement(index);
  }

  getContentElement(index) {
    const selector = `${this.options.id} #tab-${index}`;
    return j(`${selector} .content`).length
      ? j(`${selector} .content`)
      : j(selector);
  }

  handleGag(msg, matchText) {
    const code = String.fromCharCode(parseInt('033', 8));
    return msg.replace(
      matchText,
      `${code}<span style="display: none"${code}>${matchText}${code}</span${code}>`,
    );
  }

  setupEventListeners() {
    Event.listen('before_display', (msg) => this.process(msg));
  }

  exposeToConfig() {
    Config.ChatterBox = this;
    setTimeout(() => {
      Event.fire('chatterbox_ready', this);
    }, 500);
  }

  // tab(t) {
  //   const i = this.options.tabs.length;
  //   this.options.tabs.push(t);
  //   return this.win.tab(t);
  // }
}

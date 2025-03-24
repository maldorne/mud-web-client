import jQuery from 'jquery';
import { Config } from './config.js';
import { Event } from './event.js';
import { Window } from './window.js';
import { Modal } from './modal.js';
import { Socket } from './socket.js';
import { log, stringify, param } from './utils.js';

const j = jQuery;

export class ControlPanel {
  constructor() {
    if (!window.user) return;

    this.id = '#control-panel';
    this.mobile = Config.device.mobile;
    this.touch = Config.device.touch;
    this.chatlog = [];
    this.mychannel = null;
    this.nice = null;
    this.sound = false;
    this.sitelist = window.sitelist;
    this.pref = window.user.pref;

    if (this.touch && param('host')) return;

    this.initWindow();
    this.initLayout();
    this.loadGamelist();
    this.initEventListeners();
    this.initChat();

    if (!this.touch) {
      j(`${this.id} .nice`).niceScroll({
        cursorborder: 'none',
        cursorwidth: '7px',
      });
    }
  }

  initWindow() {
    this.win = new Window({
      id: this.id,
      title: 'Game Center',
      noresize: 1,
      closeable: 0,
      class: 'nofade',
      css: {
        width: 700,
        height: 500,
        top: 0,
        right: 0,
        opacity: 1,
        zIndex: 101,
      },
    });

    j(this.id).get(0).win = this.win;
  }

  initLayout() {
    j(`${this.id} .content`).append(`
      <div style="width: 27%; border-right: 1px solid #222;" class="left gamelist nice"></div>
      <div class="left gamepanel" style="width: 72%; height: 100%"></div>
    `);

    if (this.touch) {
      this.win.maximize();
      j(`${this.id} .gamelist`).css({ width: '50%' });
      j(`${this.id} .gamepanel`)
        .css({
          width: '49%',
          overflow: 'hidden',
        })
        .addClass('nice');
    }
  }

  loadProfiles() {
    j(`${this.id} .gamelist`).prepend(`
      <div class="profiles">
        <a class="folder" data="profile-link">
          <i class="icon-folder-open-alt"></i> My Profiles
        </a><br>
      </div>
    `);

    if (!this.pref.profiles) return;

    Object.entries(this.pref.profiles).forEach(([profileName, profile]) => {
      if ((Config.clean || Config.solo) && Config.host !== profile.host)
        return;

      const gameIndex = this.sitelist.findIndex(
        (game) => game.host === profile.host,
      );
      const game = this.sitelist[gameIndex];

      j(`${this.id} .gamelist .profiles`).append(`
        <a class="profile-link" 
           host="${game.host}" 
           port="${game.port}" 
           thumb="${game.img}" 
           profile="${profileName}" 
           name="${game.name}">
          <i class="icon-star-empty"></i> ${profileName}<br>
        </a>
      `);
    });
  }

  loadMudconnectList() {
    if (Config.solo || Config.clean || this.touch) return;

    j.get('/app/xml/mudconnect.xml', (data) => {
      j(`${this.id} .gamelist .profiles`).after(`
        <div class="tmc">
          <a class="tmc-list folder">
            <i class="icon-folder-close-alt"></i> Big List (A-Z)<br>
          </a>
        </div>
      `);

      const muds = Array.from(j(data).find('mud')).sort((a, b) => {
        const titleA = j(a).find('title').text();
        const titleB = j(b).find('title').text();
        return titleA.localeCompare(titleB);
      });

      muds.forEach((mud) => {
        const name = j(mud).find('title').text();
        const host = j(mud).find('host').text();
        const port = j(mud).find('port').text();

        if (name && host && port) {
          j(`${this.id} .gamelist .tmc`).append(`
            <a style="display:none" 
               class="tmc-link game-link" 
               host="${host}" 
               port="${port}" 
               thumb="" 
               name="${name}">
              ${name}<br>
            </a>
          `);
        }
      });
    });
  }

  loadSiteList() {
    j(`${this.id} .gamelist`).append(`
      <div class="sitelist">
        <a class="big-list folder" data="game-link">
          <i class="icon-folder-open-alt"></i> Site List<br>
        </a>
      </div>
    `);

    this.sitelist.forEach((game, index) => {
      try {
        const elements = game.elements.replace(/&amp;/g, '&');
        const playMatch = elements.match(/\[play=(.+?)\]/);
        if (!playMatch) return;

        const play = playMatch[1].replace(/\\\//g, '/');

        if (!play.includes('http')) {
          const [host, port] = play.split(':');
          game.host = host;
          game.port = port;
        } else {
          game.host = play.param('host');
          game.port = play.param('port');
        }

        if (!game.host || !game.port) {
          console.log('Skipping game:', stringify(game));
          return;
        }

        if ((Config.clean || Config.solo) && Config.host !== game.host) return;

        const imgMatch = elements.match(/"(images\\\/.+?\.(png|gif|jpg))"/i);
        game.img = '/' + imgMatch[1].replace(/\\\//g, '/');

        j(`${this.id} .sitelist`).append(`
          <a class="game-link" 
             data="${index}" 
             host="${game.host}" 
             port="${game.port}" 
             thumb="${game.img}" 
             name="${game.name}">
            <i class="icon-sun"></i> ${game.name}<br>
          </a>
        `);
      } catch (error) {
        log(game);
        console.error(error);
      }
    });
  }

  loadChat() {
    j(`${this.id} .gamelist`).prepend(`
      <div class="chatlist">
        <a class="chat-list folder" data="chat-link">
          <i class="icon-folder-open-alt"></i> Portal Chat<br>
        </a>
      </div>
    `);

    const channels = ['Lobby', 'Players', 'Devs'];

    channels.forEach((channel) => {
      j(`${this.id} .chatlist`).append(`
        <a class="chat-link" data="${channel}">
          <i class="icon-comment-alt"></i> ${channel}<br>
        </a>
      `);
    });
  }

  loadGamelist() {
    j(`${this.id} .gamelist`).empty();
    this.loadSiteList();
    this.loadMudconnectList();
    this.loadProfiles();
    this.loadChat();
  }

  initEventListeners() {
    this.initDoubleClickHandler();
    this.initFolderClickHandler();
    this.initGameLinkHandler();
    this.initMacroHandlers();
    this.initTriggerHandlers();
    this.initIconHandlers();
    this.initSaveHandler();
    this.initCloneHandler();
    this.initDeleteHandler();
    this.initChatHandlers();
  }

  initDoubleClickHandler() {
    j(this.id).on('dblclick', '.tmc', (e) => {
      e.stopPropagation();
      j('.tmc .folder').click();
      j('.gamelist').scrollTop(0);
    });
  }

  initFolderClickHandler() {
    j(this.id).on('click', ' .folder', (e) => {
      e.stopPropagation();
      const $folder = j(e.currentTarget);
      $folder.siblings().toggle();

      const $icon = $folder.find('i');
      $icon.toggleClass('icon-folder-open-alt icon-folder-close-alt');

      j('.gamelist').getNiceScroll().resize();
    });
  }

  initGameLinkHandler() {
    j(this.id).on('click', ' .game-link, .profile-link', (e) => {
      e.stopPropagation();
      this.mychannel = null;

      const $link = j(e.currentTarget);
      j('.gamelist a').removeClass('game-link-selected');
      $link.addClass('game-link-selected');

      const isProfile = $link.hasClass('profile-link');
      const isTmcLink = $link.hasClass('tmc-link');

      const $panel = j(`${this.id} .gamepanel`);
      $panel.removeAttr('profile');

      const data = {
        name: $link.attr('name'),
        host: $link.attr('host'),
        port: $link.attr('port'),
        thumb: $link.attr('thumb'),
        profile: $link.attr('profile'),
      };

      this.updateGamePanel($panel, data);
    });
  }

  updateGamePanel($panel, data) {
    const { name, host, port, thumb, profile } = data;

    $panel.attr({
      name,
      host,
      port,
      ...(profile && { profile }),
    });

    const url = `/play?host=${host}&port=${port}&name=${encodeURIComponent(name)}${
      profile ? `&profile=${encodeURIComponent(profile)}` : ''
    }`;

    const playButton = `<a href="${url}" class="button-primary">play</a>`;
    const title = `${name}${profile ? `: ${profile}` : ''}`;

    j('.gamepanel .scroll').niceScroll('destroy');

    $panel.html(`
      <div class="left game-blurb" style="padding: 4px 18px 0px 4px">
        <img class="game-thumb" src="${thumb}">
      </div>
      <div class="left" style="padding-top: 4px">
        ${title}
        <div style="height: 8px; clear: both"></div>
        ${playButton}
      </div>
    `);

    if (!this.mobile) {
      this.appendButtons($panel, profile);
      this.appendTabs($panel, profile);
      this.loadSettings($panel);
    }
  }

  appendButtons($panel, profile) {
    if (profile) {
      $panel.append(`
        <br>
        <a class="kbutton save right tip" title="Save your preferences for this profile.">
          <i class="icon-save"></i> save
        </a>
        <a class="kbutton pdel right tip" title="Delete this game profile.">
          <i class="icon-remove"></i> delete
        </a>
        <div style="clear: both"></div>
      `);
    } else {
      $panel.append(`
        <br>
        <a class="kbutton save right tip" title="Save your preferences for this game.">
          <i class="icon-save"></i> save
        </a>
        <a class="kbutton clone right tip" title="Create a profile for this game.">
          <i class="icon-copy"></i> profile
        </a>
        <div style="clear: both"></div>
      `);
    }
  }

  appendTabs($panel, profile) {
    $panel.append(`
      <ul class="nav nav-tabs">
        <li class="active">
          <a href="#macros" class="kbutton" data-toggle="tab">
            <i class="icon-retweet"></i> macros
          </a>
        </li>
        <li>
          <a href="#triggers" class="kbutton" data-toggle="tab">
            <i class="icon-reply"></i> triggers
          </a>
        </li>
        <li>
          <a href="#settings" class="kbutton settings" data-toggle="tab">
            <i class="icon-cog"></i> settings
          </a>
        </li>
      </ul>
    `);

    if (!profile) {
      j(`${this.id} .gamepanel ul`).append(`
        <span class="kbutton right" title="Configurations at this level will apply to all profiles for this game">
          <i class="icon-question"></i>
        </span>
      `);
    }

    $panel.append(`
      <div class="tab-content">
        <div class="tab-pane active" id="macros">
          Macros support arguments (wildcards) in the format $1, $2... $*. 
          The macro "$me -> Myname" will replace $me with Myname in any other macros or triggers.
          <br><br>
          <a class="right kbutton macro-add">
            <i class="icon-plus"></i> new
          </a>
          <div class="scroll"></div>
        </div>
        <div class="tab-pane" id="triggers">
          Triggers support wildcards in the format $1, $2... $9.
          <br><br>
          <a class="right kbutton trigger-add">
            <i class="icon-plus"></i> new
          </a>
          <div class="scroll"></div>
        </div>
        <div class="tab-pane" id="settings">
          <div class="scroll"></div>
        </div>
      </div>
    `);
  }

  loadSettings($panel) {
    const name = $panel.attr('name');
    const profile = $panel.attr('profile');

    if (window.user.id && this.pref) {
      const gameSettings = profile
        ? this.pref.profiles?.[profile]
        : this.pref.sitelist?.[name];

      if (gameSettings) {
        this.loadMacros(gameSettings.macros);
        this.loadTriggers(gameSettings.triggers);
      }
    }

    const $settings = j(`${this.id} .gamepanel #settings .scroll`);
    const settingsOptions = [
      ['official', 'Auto-load official plugins'],
      ['echo', 'Echo commands to main window'],
      ['keepcom', 'Keep last command in input'],
      ['spellcheck', 'Spellcheck command input', true],
      ['mxp', 'Enable MXP'],
      ['automulti', 'Auto-paste multiline selects in multiline input', true],
    ];

    settingsOptions.forEach(([id, text, unchecked]) => {
      $settings.append(`
        <i class="icon-${unchecked ? 'unchecked' : 'check'}" id="${id}"></i> ${text}<br>
      `);
    });

    if (gameSettings?.settings) {
      gameSettings.settings.forEach((setting) => {
        const $icon = j(`${this.id} #settings #${setting.id}`);
        $icon.toggleClass('icon-check icon-unchecked', !setting.value);
      });
    }

    j('.gamepanel .scroll').css({ height: '280px' });

    if (!Config.touch) {
      j('.gamepanel .scroll').niceScroll({
        cursorborder: 'none',
        cursorwidth: '7px',
      });
    }
  }

  loadMacros(macros = []) {
    const $container = j('#control-panel #macros .scroll');

    macros.forEach(([name, commands, enabled, favorite]) => {
      $container.append(`
        <div>
          <input type="text" style="width: 100px" placeholder="macro name" value="${name}">
          <input type="text" placeholder="commands to send" value="${commands}">
          <i class="icon-${enabled ? 'check' : 'unchecked'}"></i>
          <i class="icon-star${favorite ? '' : '-empty'}"></i>
          <i class="icon-remove-sign"></i>
        </div>
      `);
    });
  }

  loadTriggers(triggers = []) {
    const $container = j('#control-panel #triggers .scroll');

    triggers.forEach(([phrase, response, enabled]) => {
      $container.append(`
        <div>
          <input type="text" style="width: 100px" placeholder="trigger phrase" value="${phrase}">
          <input type="text" placeholder="response" value="${response}">
          <i class="icon-${enabled ? 'check' : 'unchecked'}"></i>
          <i class="icon-remove-sign"></i>
        </div>
      `);
    });
  }

  initChat() {
    this.chat = new Socket({ type: 'chat' });

    Event.listen('chat_open', (c) => {
      log('Event: chat_open');

      if (c === this.chat) {
        this.chat.send(
          stringify({
            chat: 1,
            name: window.user.username || 'guest',
            channel: 'op',
            msg: 'joined chat.',
          }),
        );
      }
    });

    Event.listen('chat_data', (d, c) => {
      const [, key] = d.match(/([^ ]+?) /);
      const [, value] = d.match(/[^ ]+? (.*)/);

      if (key === 'portal.chatlog') {
        this.chatlog = JSON.parse(value);
        this.chatUpdate();
      } else if (key === 'portal.chat') {
        const chatEntry = [new Date().toISOString(), JSON.parse(value)];
        new Audio('/app/sound/blop.mp3').play();
        this.chatlog.push(chatEntry);
        this.chatUpdate(chatEntry);
      }

      return null;
    });

    Event.listen('chat_before_close', (c) => {
      if (c === this.chat) {
        this.chat.send(
          stringify({
            chat: 1,
            name: window.user.username || 'guest',
            channel: 'op',
            msg: 'left chat.',
          }),
        );
      }
    });

    Event.listen('chat_close', (c) => {
      if (c === this.chat) {
        j(`${this.id} .chatlist`).remove();
        this.closeChat();
      }
    });

    // Initialize chat after loading
    if (param('profile')) {
      j(`${this.id} .profile-link`).each((_, el) => {
        if (j(el).attr('profile') === param('profile')) {
          j(el).click();
        }
      });
    } else if (param('host')) {
      j(`${this.id} .game-link`).each((_, el) => {
        if (j(el).attr('host') === param('host')) {
          j(el).click();
        }
      });
    } else if (j(`${this.id} .game-link:first`).length) {
      j(`${this.id} .game-link:first`).click();
    }
  }

  closeChat() {
    j(`${this.id} .chat-panel`).remove();
    if (this.nice) this.nice.remove();
    if (window.user.channel) delete window.user.channel;
  }

  chatUpdate(entry) {
    const $chatContainer = j(`.chat-${this.mychannel}`);

    if (!entry) {
      $chatContainer.empty();
      this.chatlog.forEach(([timestamp, message]) => {
        if (this.mychannel === message.channel) {
          $chatContainer.append(this.formatChatMessage(timestamp, message));
        } else if (message.channel === 'status') {
          $chatContainer.append(this.formatStatusMessage(timestamp, message));
        }
      });
    } else if (this.mychannel === entry[1].channel) {
      $chatContainer.append(this.formatChatMessage(entry[0], entry[1]));
    }

    $chatContainer.scrollTop($chatContainer.prop('scrollHeight'));
  }

  formatChatMessage(timestamp, message) {
    return `
      <span style="opacity: 0.6">${timestamp.substr(11, 5)}</span>
      <span style="color: #01c8d4;opacity:0.7">${message.name}: </span>
      ${this.linkify(message.msg)}<br>
    `;
  }

  formatStatusMessage(timestamp, message) {
    return `
      <span style="opacity: 0.6">${timestamp.substr(11, 5)}</span>
      <span style="color: #FFEB9E;opacity:0.6">${message.name} </span>
      <span style="opacity: 0.7">${this.linkify(message.msg)}</span><br>
    `;
  }

  linkify(text) {
    return text.replace(
      /([^"']|^)(http.*:\/\/[^\s\x1b"']+)/g,
      '$1<a href="$2" target="_blank">$2</a>',
    );
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (Config.ControlPanel) {
    new ControlPanel();
  }
});

/* Havoc (c) 2014 */

import jQuery from 'jquery';
// import { Event } from './event.js';
import { config } from './config.js';
import { Window } from './window.js';
import { log, param } from './utils.js';

const j = jQuery;

export class HavocMapper {
  constructor(options = {}) {
    this.options = {
      path: `http://${config.host}/world/`,
      scale: 0.75,
      id: '#havoc-mapper',
      css: {
        height: 400,
        width: 400,
        top: 400,
        left: config.width,
      },
      ...options,
    };

    this.data = {};
    this.was = { zone: '' };
    this.tile = 72 * this.options.scale;
    this.xOffset = Math.floor(this.tile / 6);
    this.yOffset = Math.floor(this.tile / 2);

    this.maps = ['Calandor.map', 'Calandor Temple.map'];
    this.images = [
      '/aaralon/images/AaralonSplash.jpg',
      '/aaralon/world/Calandor.jpg',
      '/aaralon/world/Calandor Temple.jpg',
    ];

    this.animations = {
      '^Vwm': {
        img: this.options.path + 'core/images/scenery/windmill-',
        frames: Array.from({ length: 18 }, (_, i) =>
          String(i + 1).padStart(2, '0'),
        ),
      },
      '^Ze': {
        img: this.options.path + 'core/images/scenery/fire',
        frames: Array.from({ length: 8 }, (_, i) => String(i + 1)),
      },
    };

    this.initialize();
  }

  initialize() {
    this.loadMaps();
    this.preloadImages();
    this.setupDomElements();
    this.initializeWindow();
    this.setupEventListeners();
  }

  loadMaps() {
    this.maps.forEach((mapFile) => {
      j.get(
        this.options.path + mapFile,
        (data) => {
          const zone = mapFile.split('.')[0];
          this.data[zone] = data
            .replace(/[ \t]/g, '')
            .split('\n')
            .slice(3, -1)
            .map((line) => line.split(','));

          log('Map data loaded:', this.data);
        },
        'text',
      );
    });
  }

  preloadImages() {
    this.images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  setupDomElements() {
    this.mapSelector = `${this.options.id} .content`;
    this.imgSelector = `${this.mapSelector} #map`;
    this.markerSelector = `${this.mapSelector} #marker`;

    j(this.mapSelector).html(`
      <img id="map" 
           class="pointer" 
           style="max-width: none; max-height: none; z-index: 1; position: absolute" 
           oncontextmenu="return false;">
      <img id="marker" 
           class="tip" 
           style="width: 54px; height: 54px; z-index: 2; position: absolute; display: none" 
           src="/aaralon/images/brush.png">
    `);

    j(this.options.id).prepend(`
      <div class="inbar" style="position: absolute; top: 0px; left: 0px; z-index: 2; height: 20px; width: 100%; text-align: center;">
        <div class="title" style="white-space: nowrap; text-overflow: ellipsis; font-size: ${this.options.mini ? 10 : 13}px;"></div>
      </div>
    `);
  }

  initializeWindow() {
    this.window = new Window({
      id: this.options.id,
      title: 'HavocMapper',
      class: 'nofade nofront',
      handle: '.inbar',
      css: this.options.css,
      onResize: () => this.go(this.was),
    });

    this.loadImage(this.options.path + 'Calandor.jpg', this.imgSelector);

    j(`${this.options.id} .ui-resizable-handle`).css('zIndex', 3);

    this.niceScroll = j(this.mapSelector)
      .addClass('nice')
      .niceScroll({
        cursorborder: 'none',
        zindex: 3,
        cursorwidth: 8,
        railoffset: { top: -4, left: -4 },
      });
  }

  setupEventListeners() {
    j(document).on('click', this.imgSelector, (e) => this.handleClick(e));
  }

  loadImage(src, target) {
    return j(target).attr('src', src);
  }

  setTitle(info) {
    const title = `${this.was.id || this.was.zone}: ${this.was.x}x${this.was.y} ${info.name}`;
    this.window.setTitle(title);
    j(this.markerSelector).attr('title', title);
  }

  animate(data) {
    if (!data.terrain) return;

    j('.ani').animateSprite('stop').remove();

    const animation = Object.entries(this.animations).find(([key]) =>
      data.terrain.includes(key),
    )?.[1];

    if (!animation) return;

    j(this.mapSelector).append(
      `<img class="ani" src="${animation.img}${animation.frames[0]}.png">`,
    );

    j('.ani')
      .css(this.getPosition(this.was))
      .animateSprite({
        columns: animation.frames.length,
        fps: 12,
        loop: true,
        animations: {
          run: animation.frames,
        },
      })
      .animateSprite('play', 'run');
  }

  loadZone(zone) {
    this.loadImage(`${this.options.path}${zone}.jpg`, this.imgSelector);
  }

  getPosition(at) {
    if (!at.x) return { left: 0, top: 0 };

    const oddX = at.x % 2;
    const mX = this.xOffset + this.tile * 0.75 * at.x - this.tile / 2;
    const mY = this.tile * at.y - this.tile / 2 + (!oddX ? this.yOffset : 0);

    log(`Position - mX: ${mX} mY: ${mY}`);
    return { left: mX - 4, top: mY - 5 };
  }

  go(at) {
    at = at || this.was;

    if (this.was.zone !== at.zone) {
      this.loadZone(at.proto || at.zone);
      setTimeout(() => this.go(at), 1500);
      return;
    }

    const imgWidth = j(this.imgSelector).width();
    const imgHeight = j(this.imgSelector).height();
    const mapWidth = j(this.mapSelector).width();
    const mapHeight = j(this.mapSelector).height();

    const pos = this.getPosition(at);
    j(this.markerSelector).css(pos).show();

    let x = pos.left + this.tile / 2 - mapWidth / 2;
    let y = pos.top + this.tile / 2 - mapHeight / 2;

    x = Math.max(0, Math.min(x, imgWidth - mapWidth));
    y = Math.max(0, Math.min(y, imgHeight - mapHeight));

    j(this.mapSelector).scrollLeft(x).scrollTop(y);
    this.was = at;

    this.niceScroll?.resize();

    if (!this.options.mini) {
      this.animate(at);
      this.checkHome(at);
    }

    return this;
  }

  checkHome(at) {
    if (!param('gui')) return;

    const isHome = at.zone === 'Calandor' && at.x === 78 && at.y === 29;
    const homeButton = j('#bar #home');

    if (isHome && homeButton.text().includes('recall')) {
      homeButton.html('<img src="/bedlam/art/cache/ui/cmdrent@2x.png"> home');
    } else if (!isHome && homeButton.text().includes('home')) {
      homeButton.html(
        '<img src="/bedlam/art/cache/ui/cmdrent@2x.png"> recall',
      );
    }
  }

  handleClick(event) {
    const offset = j(event.target).offset();
    let x = event.clientX - offset.left;
    let y = event.clientY - offset.top;

    x -= this.xOffset * 2;
    const mX = Math.round(x / (this.tile * 0.75));

    if (!(mX % 2)) {
      y -= this.yOffset - this.xOffset;
    }

    const mY = Math.round(y / this.tile);
    log(`Click - mX: ${mX} mY: ${mY}`);

    if (config.socket) {
      config.socket.write(`travel ${mX} ${mY}`);
    }
  }

  update(data) {
    if (!data?.start) return data;

    try {
      if (data.startsWith('ch.at ')) {
        log(`Havoc${this.options.mini ? '(mini)' : ''}Mapper.update at`);
        const at = JSON.parse(data.match(/[^ ]+ (.*)/)[1]);
        this.go(at);
      } else if (data.startsWith('room.info ')) {
        log('HavocMapper.update room.info');
        const info = JSON.parse(data.match(/[^ ]+ (.*)/)[1]);
        this.setTitle(info);
        this.animate(info);
      }
    } catch (err) {
      log('Mapper gmcp parse error:', err);
    }

    return data;
  }
}

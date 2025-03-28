import { param } from './utils.js';
import { log } from './utils.js';
import jQuery from 'jquery';

const j = jQuery;

export class Config {
  constructor() {
    // Default values
    this.debug = false;
    this.host = 'muds.maldorne.org';
    this.port = '5010';
    this.name = 'House of Maldorne';
    this.profile = null;
    this.width = 800;
    this.height = j(window).height() - 80;
    this.top = false;
    this.left = false;
    this.clean = false;
    this.solo = false;
    // this.nocenter = false;
    this.notrack = false;
    this.nodrag = false;
    this.embed = false;
    this.kong = null;
    this.collapse = [];
    this.dev = false;
    this.onfirst = false;
    this.separator = ';';
    this.proxy = 'wss://play.maldorne.org:6200/';
    this.uncompressed = false;
    this.useMuProtocol = false;
    this.chatterbox = false;
    this.chatterboxConfig = null;
    this.settings = [];
    this.controlPanel = false;

    // Device detection
    this.device = {
      touch: 'ontouchstart' in window,
      lowres: j(window).width() <= 640 && j(window).height() <= 640,
      mobile: j(window).width() <= 640 && j(window).height() <= 640,
      tablet: 'ontouchstart' in window && j(window).width() > 640,
      width: j(window).width(),
      height: j(window).height(),
    };

    this.view = `${this.host}:${this.port}:${window.screen.width}x${window.screen.height}`;
  }

  async loadMudConfig(mudName) {
    try {
      const response = await fetch(`/muds/${mudName}.json`);
      return await response.json();
    } catch (error) {
      log('Error loading MUD configuration:', error);
      return null;
    }
  }

  getSettings() {
    const s = [];
    if (!window.user) return s;

    if (window.user?.pref?.sitelist?.[param('name')]) {
      j.extend(true, s, window.user.pref.sitelist[param('name')].settings);
    }

    if (
      param('profile') &&
      window.user?.pref?.profiles?.[param('profile')]?.settings
    ) {
      j.extend(true, s, window.user.pref.profiles[param('profile')].settings);
    }

    return s;
  }

  getSetting(id) {
    if (!this.settings.length) return null;
    return this.settings.find((setting) => setting.id === id)?.value ?? null;
  }

  async initialize() {
    // Load MUD config from json files
    const mudName = param('mud') || 'example';
    const mudConfig = await this.loadMudConfig(mudName);

    if (mudConfig) {
      // Get all configurable fields from the class instance
      const fields = Object.keys(this).filter(
        (key) =>
          typeof this[key] !== 'function' &&
          key !== 'device' &&
          key !== 'view',
      );

      // Update each field if it exists in mudConfig
      fields.forEach((field) => {
        if (field in mudConfig) {
          this[field] = mudConfig[field];
        }
      });

      // Special handling for nested chatterbox config
      if (mudConfig.chatterbox) {
        this.chatterboxConfig = structuredClone(mudConfig.chatterboxConfig);
        this.chatterbox = true;
      }
    }

    // URL parameters override default values and config file values
    this.debug = param('debug') || this.debug;
    this.host = param('host') || this.host;
    this.port = param('port') || this.port;
    this.name = param('name') || this.name;
    this.profile = param('profile');
    this.width = param('width') || this.width;
    this.height = param('height') || this.height;
    this.top = param('top') || this.top;
    this.left = param('left') || this.left;
    this.clean = window.location.search.includes('clean') || this.clean;
    this.solo = window.location.search.includes('solo') || this.solo;
    // this.nocenter =
    //   window.location.search.includes('nocenter') || this.nocenter;
    this.notrack = param('notrack') || this.notrack;
    this.nodrag = param('nodrag') || this.nodrag;
    this.embed = param('embed') || this.embed;
    this.kong = param('kong');
    this.dev = window.location.search.includes('dev') || this.dev;
    this.onfirst = param('onfirst') || this.onfirst;
    this.separator = window.location.search.includes('separator')
      ? param('separator')
      : this.separator;
    this.uncompressed = param('uncompressed') || this.uncompressed;
    this.useMuProtocol = param('useMuProtocol') || this.useMuProtocol;
    this.chatterbox = param('chatterbox') || this.chatterbox;
    this.controlPanel = param('controlPanel') || this.controlPanel;

    // Update settings and view
    this.settings = this.getSettings();
    this.view = `${this.host}:${this.port}:${window.screen.width}x${window.screen.height}`;
  }
}

export const MU_CHANNELS = {
  TEXT: 't',
  JSON: 'j',
  HTML: 'h',
  PUEBLO: 'p',
  PROMPT: '>',
};

// Create and export a single instance
export const config = new Config();

import { param } from './utils.js';
import { log, stringify } from './utils.js';
import jQuery from 'jquery';

const j = jQuery;

function getSettings() {
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

export const Config = {
  debug: param('debug') || 0,
  host: param('host') || 'muds.maldorne.org',
  port: param('port') || '5010',
  name: param('name') || 'House of Maldorne',
  profile: param('profile'),
  width: param('width') || 800,
  height: param('height') || j(window).height() - 80,
  top: param('top') || 0,
  left: param('left') || 0,
  clean: window.location.search.includes('clean') || 0,
  solo: window.location.search.includes('solo') || 0,
  nocenter: window.location.search.includes('nocenter') || 0,
  notrack: param('notrack') || 0,
  nodrag: param('nodrag') || 0,
  embed: param('embed') || 0,
  kong: param('kong'),
  collapse: [],
  dev: window.location.search.includes('dev') || 0,
  onfirst: param('onfirst') || 0,
  separator: window.location.search.includes('separator')
    ? param('separator')
    : ';',
  proxy: 'wss://play.maldorne.org:6200/',
  view: `${param('host')}:${param('port')}:${window.screen.width}x${window.screen.height}`,
  uncompressed: param('uncompressed') || 0,

  device: {
    touch: 'ontouchstart' in window,
    lowres: j(window).width() <= 640 && j(window).height() <= 640,
    mobile: j(window).width() <= 640 && j(window).height() <= 640,
    tablet: 'ontouchstart' in window && j(window).width() > 640,
    width: j(window).width(),
    height: j(window).height(),
  },

  settings: getSettings(),

  getSetting(id) {
    if (!this.settings.length) return null;
    return this.settings.find((setting) => setting.id === id)?.value ?? null;
  },
};

log(Config);
log(stringify(Config.settings));

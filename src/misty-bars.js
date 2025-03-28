import jQuery from 'jquery';
import { Event } from './event.js';
import { Window } from './window.js';
import { config } from './config.js';
import { log, stringify, addCommas } from './utils.js';

const j = jQuery;

export class MistyBars {
  constructor(options = {}) {
    this.id = '#bar-window';
    this.win = null;
    this.characterStatus = {};
    this.characterVitals = {};

    this.options = {
      title: 'MistyBars',
      process: null,
      listen: null,
      ...options,
    };

    // Initialize bars
    this.draw();

    // Setup event listeners
    if (this.options.listen) {
      Event.listen(this.options.listen, (data) => this.process(data));
    } else {
      Event.listen('gmcp', (data) => this.process(data));
    }
    /*
    Event.listen('scrollview_ready', function(d, sv) {
        sv.win.button({
            icon: 'icon-th-list',
            title: 'Hide / show the misty status bar.',
            click: function() {
                j('#bar-window').toggle();
                Config.MistyBars.win.front();
            }
        });
    });*/
  }

  process(data) {
    if (!data || !data.includes('char.')) return data;

    try {
      const [, key] = data.match(/([^ ]+?) /);
      const [, value] = data.match(/[^ ]+? (.*)/);

      const status = {};
      status[key] = JSON.parse(value);

      this.characterStatus = status['char.status'] || this.characterStatus;

      if (status['char.vitals']) {
        const vitals = status['char.vitals'];
        this.characterVitals = {
          ...this.characterVitals,
          hp: vitals.hp ?? this.characterVitals.hp,
          mana: vitals.mana ?? this.characterVitals.mana,
          moves: vitals.moves ?? this.characterVitals.moves,
        };
      }

      if (status['char.maxstats']) {
        const maxStats = status['char.maxstats'];
        this.characterVitals = {
          ...this.characterVitals,
          maxhp: maxStats.maxhp ?? this.characterVitals.maxhp,
          maxmana: maxStats.maxmana ?? this.characterVitals.maxmana,
          maxmoves: maxStats.maxmoves ?? this.characterVitals.maxmoves,
        };
      }

      if (
        this.characterStatus &&
        this.characterVitals.hp &&
        this.characterVitals.maxhp
      ) {
        this.redraw();
      }

      log('MistyBars (default): ' + stringify(status));
    } catch (err) {
      log('MistyBars gmcp parse error: ' + err);
    }

    return data;
  }

  draw() {
    let zIndex = 1;

    this.win = new Window({
      id: this.id,
      title: this.options.title || 'MistyBars',
      class: 'bar-window nofade',
      transparent: 1,
      noresize: 1,
      css: {
        height: 130,
        width: 360,
        top: j(window).height() - 140,
        left: config.width + 30,
      },
    });

    j(`${this.id} .content`).append(`
      <img class="status grayscale" src="/app/images/bedlam-status.png">
      <img class="bars" src="/app/images/bedlam-status-bars.png">
      <div class="smoke hpbar"><img src="/app/images/bedlam-orb-smoke.png"></div>
      <div class="bar-wrapper">
        <div class="manabar black"></div>
        <div class="movebar black"></div>
        <div class="expbar black"></div>
        <div class="tarbar black"></div>
      </div>
      <div class="hp-label label"><span class="hp now"></span><span class="maxhp max"></span></div>
      <div class="mana-label label"><span class="mana now"></span><span class="maxmana max"></span></div>
      <div class="moves-label label"><span class="moves now"></span><span class="maxmoves max"></span></div>
      <div class="exp-label label single-label"></div>
      <div class="tar-label label single-label"></div>
    `);

    const selector = `${this.id} .`;
    j(`${selector}bars`).css({ zIndex });
    j(`${selector}smoke`).css({ zIndex: ++zIndex });
    j(`${selector}bar-wrapper`).css({ zIndex });
    j(`${selector}black`).css({ zIndex });
    j(`${selector}status`).css({ zIndex: ++zIndex });
    j(`${selector}label`).css({ zIndex: ++zIndex });
  }

  redraw() {
    const width = 200;
    const barSelector = '#bar-window .';
    const outSelector = '#out-window .';
    const cv = this.characterVitals;
    const cs = this.characterStatus;

    // Update labels
    j(`${barSelector}hp`).html(cv.hp);
    j(`${barSelector}mana`).html(cv.mana);
    j(`${barSelector}moves`).html(cv.moves);
    j(`${barSelector}maxhp`).html(`/${cv.maxhp}`);
    j(`${barSelector}maxmana`).html(`/${cv.maxmana}`);
    j(`${barSelector}maxmoves`).html(`/${cv.maxmoves}`);

    // Animate main bars
    j(`${barSelector}hpbar`).animate(
      { height: 120 - 120 * (cv.hp / cv.maxhp) },
      1000,
      'easeInOutExpo',
    );
    j(`${barSelector}manabar`).animate(
      { width: width - width * (cv.mana / cv.maxmana) },
      1000,
      'easeInOutExpo',
    );
    j(`${barSelector}movebar`).animate(
      { width: width - width * (cv.moves / cv.maxmoves) },
      1000,
      'easeInOutExpo',
    );

    // Animate mini bars
    j(`${outSelector}mini-hpbar`).animate(
      { width: `${parseInt((cv.hp / cv.maxhp) * 100)}%` },
      1000,
      'easeInOutExpo',
    );
    j(`${outSelector}mini-manabar`).animate(
      { width: `${parseInt((cv.mana / cv.maxmana) * 100)}%` },
      1000,
      'easeInOutExpo',
    );
    j(`${outSelector}mini-movebar`).animate(
      { width: `${parseInt((cv.moves / cv.maxmoves) * 100)}%` },
      1000,
      'easeInOutExpo',
    );

    // Update enemy info
    if (cs.enemy?.length) {
      j(`${barSelector}tar-label`).html(
        `<span class='no-target'>${cs.enemy}</span>`,
      );
    }

    if (cs.enemypct === -1) {
      j(`${barSelector}tar-label`).empty();
    }

    j(`${barSelector}tarbar`).animate(
      { width: width - width * (cs.enemypct / 100) },
      1200,
      'easeInOutExpo',
    );

    if (!cs.exp) return;

    const tnl = cs.tnl !== -1 ? cs.tnl : null;

    j(`${barSelector}exp-label`).html(
      tnl ? `${addCommas(cs.tnl)}/${addCommas(cs.enl)}` : addCommas(cs.exp),
    );

    if (tnl) {
      j(`${barSelector}expbar`).animate(
        { width: width - width * (cs.tnl / cs.enl) },
        1000,
        'easeInOutExpo',
      );
    }
  }
}

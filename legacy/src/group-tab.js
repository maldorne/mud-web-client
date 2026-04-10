import jQuery from 'jquery';
import { config } from './config.js';
import { log } from './utils.js';

const j = jQuery;
const PATH = '/app/images/group-';

export class GroupTab {
  constructor(options) {
    this.options = {
      id: '#group-tab',
      title: 'Group',
      ...options,
    };

    this.group = null;
    this.affs = null;
    this.minimizedMembers = new Set();
    this.path = PATH;
  }

  initialize() {
    log('GroupTab: init');

    this.options.id = config.ChatterBox.addTab({
      name: this.options.title || 'Group',
      before: true,
      scroll: true,
      html: '<div class="list" style="clear:both; min-height: 30px; height: 100%; position: relative"></div>',
      class: 'group-tab-content',
    });

    j(`${this.options.id} .group-member`).click((e) => {
      j(`${this.options.id} .group-member`).removeClass('active');
      j(e.currentTarget).addClass('active');
    });
  }

  draw() {
    const members = this.group.members;
    j(`${this.options.id} .list`).empty();

    members.forEach((member, index) => {
      const healthWidth = Math.floor((member.info.hp * 186) / member.info.mhp);
      const manaWidth = Math.floor((member.info.mn * 186) / member.info.mmn);
      const moveWidth = Math.floor((member.info.mv * 186) / member.info.mmv);

      const memberHtml = `
        <div class="group-member ${member.name}" data="${member.name}" id="group-member-${index}" num="${index}">
          <i class="icon icon-double-angle-up member-close ui-button" style="position: absolute; z-index:2;" tabindex="1" title="minimize member panel"></i>
          <i class="icon icon-double-angle-down member-show ui-button" style="position: absolute; z-index:2; display:none;" tabindex="1" title="maximize member panel"></i>
          <div class="noart">
            <div class="group-name">${member.name}</div>
            <div class="group-desc">${member.info.class}, Level ${member.info.lvl}</div>
            <div class="group-chat"></div>
            <div class="group-bars">
              <img class="group-bar group-healthbar" src="${this.path}healthbar.png" style="width:${healthWidth}px">
              <img class="group-bar group-manabar" src="${this.path}manabar.png" style="width:${manaWidth}px">
              <img class="group-bar group-movebar" src="${this.path}movebar.png" style="width:${moveWidth}px">
              <img class="group-bar group-expbar" src="${this.path}expbar.png">
            </div>
            <div class="group-stats">
              <span class="group-stat group-hp">${member.info.hp}</span> / <span class="group-maxhp">${member.info.mhp}</span><br>
              <span class="group-stat group-mn">${member.info.mn}</span> / <span class="group-maxmn">${member.info.mmn}</span><br>
              <span class="group-stat group-mv">${member.info.mv}</span> / <span class="group-maxmv">${member.info.mmv}</span><br>
              <span class="group-stat group-exp">100%</span><br>
            </div>
          </div>
          <div class="group-aff"></div>
        </div>
      `;

      j(`${this.options.id} .list`).append(memberHtml);
    });

    this.setupMemberEvents();
    j(`${this.options.id} .list`).disableSelection();

    if (this.options.noart) {
      j(`${this.options.id} .noart div`).css({ left: 20 });
    }
  }

  setupMemberEvents() {
    j(`${this.options.id} .group-member .member-close`).click((e) => {
      const parent = j(e.currentTarget).parent();
      const memberIndex = parseInt(parent.attr('num'));
      const memberName = this.group.members[memberIndex].name;

      parent.css({ height: 24 });
      parent.find('.group-icon, .group-desc').hide();
      parent.find('.group-bars').css({ top: 14 });
      j(e.currentTarget).hide();
      parent.find('.member-show').show();
      this.minimizedMembers.add(memberName);
    });

    j(`${this.options.id} .group-member .member-show`).click((e) => {
      const parent = j(e.currentTarget).parent();
      const memberIndex = parseInt(parent.attr('num'));
      const memberName = this.group.members[memberIndex].name;

      parent.css({ height: 82 });
      j(e.currentTarget).hide();
      parent.find('.group-icon, .group-desc').show();
      parent.find('.group-bars').css({ top: 28 });
      parent.find('.member-close').show();
      this.minimizedMembers.delete(memberName);
    });
  }

  updateAffs() {
    if (!this.group?.members?.[0]?.name) return;

    const affContainer = j(
      `${this.options.id} .list .${this.group.members[0].name} .group-aff`,
    );
    affContainer.empty();

    this.affs?.forEach((aff) => {
      const affHtml = aff.gives
        ? `<div class="group-one-aff tip" title="Gives ${aff.gives} to ${aff.to}">${aff.name}: ${aff.duration}</div>`
        : `<div class="group-one-aff">${aff.name}: ${aff.duration}</div>`;

      affContainer.append(affHtml);
    });
  }

  update(data) {
    if (data.startsWith('group {')) {
      try {
        this.group = JSON.parse(data.match(/^[^ ]+ (.*)/)[1]);
        this.draw();
        this.updateAffs();
      } catch (err) {
        log('GroupTab gmcp parse error:', err);
      }
    } else if (data.startsWith('char.affs')) {
      try {
        this.affs = JSON.parse(data.match(/^[^ ]+ (.*)/)[1]);
        this.updateAffs();
      } catch (err) {
        log('GroupTab gmcp parse error:', err);
      }
    }

    return data;
  }

  getSelected() {
    const activeElement = j(`${this.options.id} .active`);
    if (!activeElement.length) return null;

    const index = parseInt(activeElement.attr('id'));
    return this.group?.members?.[index] || null;
  }
}

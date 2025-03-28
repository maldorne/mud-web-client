import jQuery from 'jquery';
import * as d3 from 'd3';
import { Event } from './event.js';
import { Window } from './window.js';
import { config } from './config.js';
import { log, stringify, exists, param } from './utils.js';

const j = jQuery;

export class JujuMapper {
  constructor(options = {}) {
    this.options = {
      scale: 1.6,
      width: 2000,
      height: 2000,
      nums: 0,
      css: {
        width: 400,
        height: 400,
        bottom: 0,
        left: config.width,
      },
      ...options,
    };

    this.options.seeall = this.options.seeall || param('seeall');

    if (config.kong) {
      this.options.css.width = 398;
      this.options.css.height = 240;
    }

    this.options.loadURL =
      this.options.loadURL ||
      `/index.php?option=com_portal&task=get_map&host=${config.host}&port=${config.port}`;

    this.options.saveURL = `/index.php?option=com_portal&task=save_map&host=${config.host}&port=${config.port}`;

    console.log(this.options.loadURL, this.options.saveURL);

    this.map = {};
    this.areas = {};
    this.rooms = {};
    this.exits = [];
    this.tags = [];
    this.selection = [];

    this.id = '#mapper';
    this.container = `${this.id} .content`;

    this.dist = 38;

    this.xOffset = {
      n: 0,
      e: +this.dist,
      s: 0,
      w: -this.dist,
      ne: +this.dist,
      nw: -this.dist,
      se: +this.dist,
      sw: -this.dist,
      u: +Math.floor(this.dist / 3),
      d: -Math.floor(this.dist / 3),
    };

    this.yOffset = {
      n: -this.dist,
      e: 0,
      s: +this.dist,
      w: 0,
      ne: -this.dist,
      nw: -this.dist,
      se: +this.dist,
      sw: +this.dist,
      u: -Math.floor(this.dist / 3),
      d: +Math.floor(this.dist / 3),
    };

    this.rev = {
      n: 's',
      e: 'w',
      s: 'n',
      w: 'e',
      u: 'd',
      d: 'u',
      ne: 'sw',
      nw: 'se',
      se: 'nw',
      sw: 'ne',
    };

    this.colors = [
      'Gold',
      'LightSkyBlue',
      '#90EE90',
      'Magenta',
      'Cyan',
      'CornflowerBlue',
      'Pink',
      'Green',
      'Plum',
      'Aqua',
      '#9966CC',
      'Aquamarine',
      'Bisque',
      'SandyBrown',
      'Chartreuse',
      'Chocolate',
      'GoldenRod',
      'PowderBlue',
      'PeachPuff',
      'LightGoldenRodYellow',
      'Khaki',
      'LightSalmon',
      'SandyBrown',
      'DarkSeaGreen',
      'Thistle',
      'Tan',
      'PowderBlue',
      'PapayaWhip',
      'MistyRose',
      'Orange',
      'HotPink',
      'Orchid',
      'LightSteelBlue',
      'Wheat',
      'LightSlateGray',
    ];

    this.colorIndex = 0;
    this.ready = false;
    this.at = null;
    this.prev = null;
    this.R = null;
    this.W = 0;
    this.H = 0;
    this.nice = null;
    this.skipframes = null;

    this.svg = null;
    this.c_map = null;
    this.c_lines = null;
    this.c_rooms = null;
    this.c_tags = null;
    this.lns = null;
    this.rms = null;
    this.tgs = null;

    this.initialize();
    this.setupEventHandlers();
  }

  initialize() {
    j.ajax({
      url: this.options.loadURL,
      async: true,
      cache: true,
      dataType: 'json',
      success: (d) => this.handleMapLoad(d),
      error: (e) => log('Mapper: error loading world file:', e),
    });

    if (!this.options.clean) {
      this.initializeWindow();
    }

    if (this.options.listen) {
      Event.listen(this.options.listen, this.process);
    } else {
      Event.listen('gmcp', this.process);
    }

    if (!config.Toolbar && !config.kong) {
      this.setupScrollViewButton();
    }
  }

  handleMapLoad(d) {
    try {
      if (d[0] === '"') {
        this.map = eval('(' + d + ')');
      } else {
        this.map = d;
      }

      this.unpack();

      for (let i = 0; i < this.map.areas.length; i++) {
        this.areas[this.map.areas[i].name] = this.map.areas[i];
      }

      let n = 0;
      for (let i in this.map.rooms) {
        const r = this.map.rooms[i];
        r.x = parseInt(r.x);
        r.y = parseInt(r.y);
        r.z = parseInt(r.z);

        if (this.map.rooms[i].x > this.options.width) {
          this.options.width = this.map.rooms[i].x + 100;
        }

        if (this.map.rooms[i].y > this.options.height) {
          this.options.height = this.map.rooms[i].y + 100;
        }

        n++;
      }

      j.extend(true, this.rooms, this.map.rooms);
      log('Mapper.load completed:', n, 'rooms loaded from file.');

      this.initializeSvg();
      this.ready = true;

      if (this.at) {
        this.go(this.at);
      }
    } catch (err) {
      log('Error loading map:', err);
    }
  }

  initializeSvg() {
    if (this.svg) {
      this.svg.selectAll('.room, .line, .tag').remove();
      this.svg.remove();
    }

    const width = this.options.width * this.options.scale;
    const height = this.options.height * this.options.scale;

    this.svg = d3
      .select(this.container)
      .append('svg:svg')
      .attr('width', width)
      .attr('height', height)
      .attr('transform', `scale(${this.options.scale})`)
      .attr('id', 'map');

    // Add marker definitions for arrows
    this.svg
      .append('svg:defs')
      .selectAll('marker')
      .data(['OneWayArrow'])
      .enter()
      .append('svg:marker')
      .attr('id', String)
      .attr('class', 'arrow')
      .attr('viewBox', '0 0 8 8')
      .attr('refX', 6)
      .attr('refY', 3)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,3v-3l6,3l-6,3z');

    const c = this.svg.append('svg:g').attr('id', 'container');

    this.c_map = c.append('svg:g').attr('class', 'map');

    this.c_lines = this.c_map.append('svg:g').attr('id', 'lines');

    this.c_rooms = this.c_map.append('svg:g').attr('id', 'rooms');

    this.c_tags = this.c_map.append('svg:g').attr('id', 'tags');

    if ('WebkitAppearance' in document.documentElement.style) {
      this.c_map.attr('transform', `scale(${this.options.scale})`);
    }

    j(this.container)
      .addClass('nice')
      .scroll(() => {
        clearTimeout(j.data(this, 'scrollTimer'));
        j.data(
          this,
          'scrollTimer',
          setTimeout(() => {
            log('Mapper: stopped scrolling');
            this.updateVisible();
          }, 200),
        );
      });

    this.nice = j(this.container).niceScroll({
      cursorborder: 'none',
      touchbehavior: 1,
      cursorwidth: 0,
    });

    this.W = j(this.container).width();
    this.H = j(this.container).height();
  }

  initializeWindow() {
    this.win = new Window({
      id: this.id,
      closeable: this.options.closeable || false,
      transparent: this.options.transparent || false,
      css: this.options.css,
      class: 'mapper nofade',
      title: 'Juju Mapper',
      onResize: () => {
        if (this.nice) {
          this.nice.resize();
        }
        this.go(this.at);
      },
    });

    if (!config.kong) {
      this.win.addButton({
        icon: 'icon-edit',
        title: 'Start mapping / editing.',
        click: () => {
          j(`${this.id} .icon-edit`).toggleClass('on');
          j(`${this.id} .toolbar .icon-save`).toggle();
          this.context();
        },
      });

      j(`${this.id} .toolbar .icon-save`).addClass('save').toggle();

      this.win.addButton({
        icon: 'icon-zoom-out',
        title: 'Zoom out.',
        click: (e) => {
          this.zoom('out');
          return false;
        },
      });

      this.win.addButton({
        icon: 'icon-zoom-in',
        title: 'Zoom in.',
        click: (e) => {
          this.zoom('in');
          return false;
        },
      });
    }
  }

  setupEventHandlers() {
    j(document).on('click', `${this.id} .context .reveal`, () => {
      j(this).toggleClass('on');
      this.render();
    });

    j(document).on('click', `${this.id} .context .trans`, () => {
      const S = this.rooms[this.selection[0]];
      let conv = false;

      for (const e in S.exits) {
        if (!conv && this.rooms[S.exits[e]].zone !== S.zone) {
          S.zone = this.rooms[S.exits[e]].zone;
          delete this.rooms[S.exits[e]].trans;
          conv = true;
        }

        if (conv && this.rooms[S.exits[e]].zone !== S.zone) {
          this.rooms[S.exits[e]].trans = 1;
        } else if (!conv && this.rooms[S.exits[e]].zone === S.zone) {
          this.rooms[S.exits[e]].trans = 1;
        }
      }

      this.render();
    });

    // Direction movement buttons
    j(document).on('click', `${this.id} .context .dir`, (e) => {
      const dir = j(e.target).attr('data');
      const x_off = this.xOffset[dir] / 4;
      const y_off = this.yOffset[dir] / 4;

      for (let s = 0; s < this.selection.length; s++) {
        const S = this.rooms[this.selection[s]];
        S.x += x_off;
        S.y += y_off;
        this.moveRoom(S);
      }
    });

    // Forget (remove) selected rooms
    j(document).on('click', `${this.id} .context .forget`, () => {
      for (let s = 0; s < this.selection.length; s++) {
        const S = this.rooms[this.selection[s]];
        this.svg.selectAll(`.room_${S.num}`).remove();
        delete this.rooms[S.num];
      }
      this.selection = [];
      this.render(() => {
        this.go(this.at);
      });
    });

    // Toggle dungeon flag
    j(document).on('click', `${this.id} .context .dungeon`, () => {
      if (!this.selection.length) return;

      const S = this.rooms[this.selection[0]];
      if (!S.zone) return;

      const i = this.map.areas.findIndex((a) => a.name === S.zone);
      if (!this.areas[S.zone].dungeon) {
        this.areas[S.zone].dungeon = 1;
        this.map.areas[i].dungeon = 1;
      } else {
        delete this.areas[S.zone].dungeon;
        delete this.map.areas[i].dungeon;
      }

      this.render(() => {
        this.go(this.at);
      });
    });

    j(document).on('click', `${this.id} .context .road`, function () {
      for (var s = 0; s < this.selection.length; s++) {
        var S = this.rooms[this.selection[s]];
        if (S.trans) delete S.trans;
        else S.trans = 1;
        this.svg.selectAll('.room_' + S.num).remove();
      }

      this.render(() => {
        this.go(this.at);
      });
    });

    // Upload functionality
    j(document).on('click', `${this.id} .context .upload`, function () {
      j(this).toggleClass('on');
      if (!j('.mapper .context #upload').length) {
        j('.mapper .context').append(`
            <div id='upload'>
              Existing this.:  
              <i class='icon-check checkbox' data='skip'></i> skip 
              <i class='icon-unchecked checkbox' data='merge'></i> merge 
              <i class='icon-unchecked checkbox' data='overwrite'></i> overwrite
            </div>
          `);
        j('.mapper .context #upload').append(`
            <textarea style='width: 90%; height: 300px' placeholder='Paste JSON: 
              { start: #of_start_room, rooms: [ 
                { num: room1#, name: "Room 1 Name", zone: "Zone Name", terrain: "Inside", exits: { n: room2# } }, 
                { num: room2#, name: "Room 2 Name", zone: "Zone Name", exits: { s: room1# } } 
              ]. 
              The start room is the point from which relative placement will begin, so it should be a room that already has x,y,z coordinates. 
              If you are adding only rooms with pre-calculated x,y,z coordinates, there is no need to supply a start room.'>
            </textarea>
            <div style='clear:both; height: 16px'></div>
            <a class='kbutton btest'> test </a> 
            <a class='kbutton bupload'>upload</a>
          `);
      } else {
        j('.mapper .context #upload .box-note').getNiceScroll().remove();
        j('.mapper .context #upload').remove();
      }
    });

    // Checkbox handling in upload dialog
    j(document).on('click', `${this.id} .context .checkbox`, function () {
      j(`${this.id} .context .checkbox`)
        .removeClass('icon-check')
        .addClass('icon-unchecked');
      j(this).removeClass('icon-unchecked').addClass('icon-check');
    });

    // Test button in upload dialog
    j(document).on('click', `${this.id} .context .btest`, () => {
      const data = j(`${this.id} .context #upload textarea`).val();
      const type = j(`${this.id} .context #upload .icon-check`).attr('data');

      const options = {
        data: data,
        [type]: 1,
        test: 1,
      };

      j(`${this.id} .context #upload .box-note`).remove();
      j(`${this.id} .context #upload`).prepend(
        `<div class="box-note">${this.upload(options)}</div>`,
      );
    });

    // Upload button in upload dialog
    j(document).on('click', `${this.id} .context .bupload`, () => {
      const data = j(`${this.id} .context #upload textarea`).val();
      const type = j(`${this.id} .context #upload .icon-check`).attr('data');

      const options = {
        data: data,
        [type]: 1,
      };

      this.upload(options);
    });

    // Save map data
    j(document).on('click', `${this.id} .save`, () => {
      this.save();
    });

    // Clear note when focusing textarea
    j(document).on('focus', `${this.id} .context #upload textarea`, () => {
      j(`${this.id} .context #upload .box-note`).remove();
    });

    // Room hover effects
    j(document).on('mouseover', `${this.id} .room`, (e) => {
      if (this.options.notip) return;

      j(e.target)
        .tooltip({
          container: '.mapper .content',
          position: { my: 'center bottom', at: 'center+10 top' },
        })
        .tooltip('open');

      const roomNum = j(e.target).attr('id').replace('room_', '');
      this.svg.select(`#room_${roomNum}`).attr('r', 6);
    });

    j(document).on('mouseout', `${this.id} .room`, (e) => {
      if (!this.options.notip) {
        try {
          j(e.target).tooltip('destroy');
        } catch (ex) {}
      }
      const roomNum = j(e.target).attr('id').replace('room_', '');
      this.svg.select(`#room_${roomNum}`).attr('r', 4);
    });
  }

  process = (data) => {
    if (!data.start || !data.start('room.info')) {
      return data;
    }

    log('JujuMapper.process');

    try {
      const match = data.match(/^[^ ]+ (.*)/)[1];
      log(match);
      const room = eval('(' + match + ')');

      if (this.at) {
        if (this.at.num === room.num) {
          return data;
        }
        this.prev = this.at;
      }

      if (this.rooms[room.num]) {
        this.at = this.rooms[room.num];
      } else {
        this.at = room;
      }

      if (this.ready) {
        if (this.editing()) {
          this.update(room);
        } else {
          this.go(this.at);
        }
      }
    } catch (err) {
      log('Mapper gmcp parse error:', err);
    }

    return data;
  };

  getZoneColor() {
    if (++this.colorIndex >= this.colors.length) {
      this.colorIndex = 0;
    }
    return this.colors[this.colorIndex];
  }

  moveKey(d, from, to) {
    if (exists(d[from])) {
      d[to] = d[from];
      delete d[from];
    }
  }

  pack() {
    this.map.rni = [];
    this.map.ti = [];

    for (const i in this.map.rooms) {
      const R = this.map.rooms[i];
      delete R.num;

      if (R.terrain) {
        const n = this.map.ti.indexOf(R.terrain);
        if (n === -1) {
          this.map.ti.push(R.terrain);
          R.terrain = this.map.ti.length - 1;
        } else {
          R.terrain = n;
        }
      }

      this.moveKey(R, 'terrain', 'T');
      this.moveKey(R, 'via', 'V');
      this.moveKey(R, 'name', 'N');
      this.moveKey(R, 'zone', 'O');
      this.moveKey(R, 'trans', 'R');
      if (isNaN(R.z) || R.z === 'NaN') R.z = 0;
      if (R.trans === 0) delete R.trans;
    }
  }

  unpack() {
    for (const i in this.map.rooms) {
      const R = this.map.rooms[i];
      R.num = i;

      this.moveKey(R, 'T', 'terrain');
      this.moveKey(R, 'V', 'via');
      this.moveKey(R, 'N', 'name');
      this.moveKey(R, 'O', 'zone');
      this.moveKey(R, 'R', 'trans');

      if (R.zone && this.map.areas[parseInt(R.zone)]) {
        R.zone = this.map.areas[parseInt(R.zone)].name;
      }

      if (this.map.rni) {
        R.name = this.map.rni[parseInt(R.name)];
      }

      if (this.map.ti?.length) {
        R.terrain = this.map.ti[parseInt(R.terrain)];
      }

      delete R.inside;
      delete R.deadend;
      delete R.entrance;
      delete R.exit;
    }
    delete this.map.rni;
  }

  save() {
    j(`${this.id} .icon-save`).replaceWith(
      '<i class="icon icon-spinner spinner"></i>',
    );

    this.map.rooms = j.extend(true, {}, this.rooms);
    this.pack();

    j.post(this.options.saveURL, { data: this.map }, () => {
      j(`${this.id} .icon-spinner`).replaceWith(
        '<i class="icon icon-save save" title="Save the latest map data."></i>',
      );
    });
  }

  editing() {
    return j(`${this.id} .icon-edit`).hasClass('on');
  }

  seeall() {
    if (this.options.seeall) return true;
    if (!this.editing()) return false;
    return j(`${this.id} .reveal`).hasClass('on');
  }

  escape(d) {
    if (!exists(d)) return 'unknown';
    return d.replace(/[ ,;'"\/\\\(\)&]/g, '');
  }

  flatExits(r) {
    return d3.entries(r.exits).filter((d) => {
      return d.key !== 'd' && d.key !== 'u';
    }).length;
  }

  noexit(r) {
    return !r.exits || j.isEmptyObject(r.exits);
  }

  exitType(d) {
    if (
      this.rooms[d.to.num].exits &&
      this.rooms[d.to.num].exits[this.rev[d.e]] !== d.from.num
    ) {
      return 'jump';
    }

    if (d.e.includes('n') && d.to.y >= d.from.y) return 'jump';
    if (d.e.includes('s') && d.to.y <= d.from.y) return 'jump';
    if (d.e.includes('w') && d.to.x >= d.from.x) return 'jump';
    if (d.e.includes('e') && d.to.x <= d.from.x) return 'jump';
    if (d.from.num === d.to.num) return 'jump';

    return 'normal';
  }

  drawExit(d) {
    if (d.type === 'jump') {
      const ghost = {
        x: d.from.x + this.xOffset[d.e] * 0.8,
        y: d.from.y + this.yOffset[d.e] * 0.8,
      };

      const dx = d.to.x - ghost.x;
      const dy = d.to.y - ghost.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;

      let flip = d.flip ? 0 : 1;

      if (d.e === 'e' && d.to.x < d.from.x && d.to.y < d.from.y) {
        flip = 0;
      }
      if (d.e === 's' && d.to.x < d.from.x && d.to.y > d.from.y) {
        flip = 0;
      }

      return `M${d.from.x},${d.from.y}L${ghost.x},${ghost.y}M${ghost.x},${ghost.y}A${dr},${dr} 0 0,${flip} ${d.to.x},${d.to.y}`;
    } else if (
      (this.W > 1000 && Math.abs(d.from.x - d.to.x) > 600) ||
      Math.abs(d.from.y - d.to.y) > 600
    ) {
      return null;
    } else {
      return d3.svg.line().interpolate('linear')([
        [d.from.x, d.from.y],
        [d.to.x, d.to.y],
      ]);
    }
  }

  render(cb) {
    if (!this.ready || !this.at) {
      setTimeout(() => this.render(), 1000);
      log('Delaying render until map is loaded.');
      return;
    }

    log('Mapper.render @' + this.at.num);

    this.W = j(this.container).width();
    this.H = j(this.container).height();

    log('W ' + this.W + ' H ' + this.H);

    const see = this.seeall();
    this.selection = [];

    this.genRooms();
    this.genExits();

    if (!this.options.notip) {
      j(`${this.container} .room`).each(function () {
        try {
          j(this).tooltip('destroy');
        } catch (ex) {}
      });
    }

    this.svg.selectAll('.room, .line, .tag').remove();

    // Add lines
    this.lns = this.c_lines
      .selectAll('.line')
      .data(this.exits, (d) => 'line_' + (d.from.num + '-' + d.to.num))
      .enter()
      .append('svg:path')
      .attr('id', (d) => 'line_' + (d.from.num + '-' + d.to.num))
      .attr('class', (d) => {
        let c = `line room_${d.from.num} room_${d.to.num} a_${this.escape(d.to.zone || d.from.zone)}`;
        c += ` z-${d.z}`;
        if (see && d.from.zone !== this.at.zone) c += ' seeall';
        return c;
      })
      .attr('marker-end', (d) =>
        d.type === 'jump' ? 'url(#OneWayArrow)' : null,
      )
      .attr('fill', (d) => {
        if (this.at.num === d.from.num) return 'White';
        if (this.at.num === d.to.num && d.type !== 'jump') return 'White';
        if (d.from.z !== d.to.z) return 'Crimson';
        if (this.areas[d.to.zone || d.from.zone]) {
          return this.areas[d.to.zone || d.from.zone].color;
        }
        return null;
      })
      .style('stroke', (d) => {
        if (this.at.num === d.from.num) return 'White';
        if (this.at.num === d.to.num && d.type !== 'jump') return 'White';
        if (d.from.z !== d.to.z) return 'Crimson';
        if (this.areas[d.to.zone || d.from.zone]) {
          return this.areas[d.to.zone || d.from.zone].color;
        }
        return null;
      })
      .style('stroke-dasharray', (d) => (d.type === 'jump' ? '5, 4' : null))
      .attr('d', (d) => this.drawExit(d));

    // Add rooms
    this.rms = this.c_rooms
      .selectAll('.room')
      .data(this.R, (d) => d.num)
      .enter()
      .append('svg:circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('id', (d) => 'room_' + d.num)
      .attr('title', (d) =>
        this.options.nums || this.editing() ? d.num + ': ' + d.name : d.name,
      )
      .attr('class', (d) => {
        let c = `room room_${d.num} a_${this.escape(d.zone)}${d.num === this.at.num ? ' active' : ''}`;
        c += ` z-${d.z}`;
        if (see && !c.includes('active')) c += ' seeall';
        return c;
      })
      .style('stroke', (d) => this.areas[d.zone]?.color)
      .style('fill', (d) => this.areas[d.zone]?.color)
      .on('mousedown', (d) => {
        if (!this.editing()) {
          d3.event.stopPropagation();

          if (this.at.num !== d.num) {
            const p = this.path(d);
            if (p) {
              p.shift();
              for (let i = 0; i < p.length; i++) {
                p[i] = p[i][0];
                config.socket.write(p[i]);
              }
            }
          }
          return;
        }

        const me = this.svg.select('#room_' + d.num);

        if (d3.event.ctrlKey) {
          const zone = this.svg.selectAll('.a_' + this.escape(d.zone));

          if (me.attr('selected')) {
            zone
              .style('stroke', this.areas[d.zone].color)
              .style('stroke-width', 1)
              .attr('selected', function (d) {
                if (!d.e) this.selection.remove(d.num);
                return null;
              });
          } else {
            zone
              .style('stroke', 'Crimson')
              .style('stroke-width', 2)
              .attr('selected', function (d) {
                if (!d.e) this.selection.push(d.num);
                return 1;
              });
          }
        } else {
          const scope = this.svg.selectAll('.room_' + d.num);

          if (me.attr('selected')) {
            scope
              .style('stroke', this.areas[d.zone].color)
              .style('stroke-width', 1)
              .attr('selected', null);
            this.selection = this.selection.filter((num) => num !== d.num);
          } else {
            scope
              .style('stroke', 'Crimson')
              .style('stroke-width', 2)
              .attr('selected', '1');
            this.selection.push(d.num);
          }
        }

        j('#mapper .context .selection').remove();

        j('#mapper .context').append(
          `<span class="selection">${this.selection.length} rooms selected</span>`,
        );

        if (this.selection.length !== 1) {
          j('#mapper .context .trans').hide();
        } else if (this.rooms[this.selection[0]].trans) {
          j('#mapper .context .trans').show();
        }

        d3.event.stopPropagation();
      });

    // Add tags
    this.tgs = this.c_tags
      .selectAll('.tag')
      .data(this.tags, (d) => 'tag_' + d.to.num)
      .enter()
      .append('svg:text')
      .text((d) => d.to.zone)
      .style('fill', (d) => this.areas[d.to.zone]?.color)
      .attr('x', (d) => {
        const x = d.to.x - d.to.zone.length * 1.8;
        return x;
      })
      .attr('y', (d) => {
        let y = d.to.y;
        y -= this.yOffset[d.e];
        return y - 20;
      })
      .attr('id', (d) => 'tag_' + d.to.num)
      .attr('class', (d) => {
        let c = `tag room_${d.to.num} a_${this.escape(d.to.zone)}`;
        c += ` z-${d.to.z}`;
        return c;
      });

    this.svg.selectAll('.room').classed('in', 0).attr('r', 4);

    this.svg.selectAll('.room, .line').classed('active', 1);

    this.svg.selectAll('.tag').classed('active', 0);
    this.svg
      .selectAll('.tag:not(.a_' + this.escape(this.at.zone) + ')')
      .classed('active', 1);
    this.svg.selectAll('.tag:not(.z-' + this.at.z + ')').classed('active', 0);

    if (!this.seeall()) {
      this.svg
        .selectAll('.room:not(.a_' + this.escape(this.at.zone) + ')')
        .classed('active', 0);
      this.svg
        .selectAll('.line:not(.a_' + this.escape(this.at.zone) + ')')
        .classed('active', 0);
      this.svg
        .selectAll('.room:not(.z-' + this.at.z + ')')
        .classed('active', 0);
      this.svg
        .selectAll('.line:not(.z-' + this.at.z + ')')
        .classed('active', 0);
    } else {
      this.svg.selectAll('.tag').classed('active', 1);
    }

    this.svg
      .selectAll('.room_' + this.at.num)
      .style('active', 1)
      .classed('in', 1)
      .attr('r', 6);

    j('#mapper .context .trans').hide();
    j('#mapper .context .selection').remove();

    if (cb) {
      if (config.debug) log('Mapper.render callback');
      cb();
    }
  }

  updateVisible(cb) {
    if (config.debug) log('Mapper.updateVisible');

    if (!this.options.notip) {
      try {
        j(this.container + ' .room').tooltip('destroy');
      } catch (ex) {}
    }

    this.render(cb);
  }

  moveRoom(r) {
    log('Mapper.moveRoom:', stringify(r));

    this.svg
      .select('#room_' + r.num)
      .transition()
      .duration(500)
      .attr('cx', r.x)
      .attr('cy', r.y);

    this.genExits(this.R);

    this.svg
      .selectAll('.line.room_' + r.num)
      .transition()
      .duration(500)
      .attr('d', this.drawExit);
  }

  genRooms() {
    log('mapper.genRooms: ' + stringify(this.at));

    const T = j(this.container).scrollTop();
    const L = j(this.container).scrollLeft();
    let n = 0;
    const loc = [];
    const dungeon = this.areas[this.at.zone]
      ? this.areas[this.at.zone].dungeon
      : 0;
    const edit = this.editing();
    const see = this.seeall();
    const noex = this.noexit(this.at);

    this.R = d3.values(this.rooms).filter((r) => {
      if (dungeon && r.zone !== this.at.zone && r.trans !== 1) {
        return false;
      }

      if (!see && r.z !== this.at.z) {
        // don't render rooms 2 vertical levels apart
        if (Math.abs(r.z - this.at.z) > 1) {
          return false;
        }
      }

      if (!r.x) {
        return false;
      }

      const x = r.x * this.options.scale;
      const y = r.y * this.options.scale;

      if (!(y >= T && y <= T + this.H && x >= L && x <= L + this.W)) {
        return false;
      }

      if (this.areas[r.zone]) {
        if (
          !see &&
          r.zone !== this.at.zone &&
          ((this.W < 1000 && n > 600) ||
            this.noexit(r) ||
            (r.trans !== 1 && this.areas[r.zone].dungeon))
        ) {
          return false;
        }

        if (
          this.W > 1200 &&
          see &&
          r.zone !== this.at.zone &&
          this.areas[r.zone].dungeon &&
          r.trans !== 1
        ) {
          return false;
        }

        if (this.W > 1200 && see && r.z < this.at.z) {
          return false;
        }
      }

      if (n > 600) {
        return false;
      }

      if (!edit && loc.includes(x + 'x' + y)) {
        return false;
      }

      loc.push(x + 'x' + y);
      n++;

      return true;
    });

    if (config.debug) {
      log('Mapper.genRooms: ' + this.R.length);
    }
  }

  genExits() {
    this.R = this.R || d3.values(this.rooms);
    this.exits = [];
    this.tags = [];
    const zonetags = [];

    for (let r = 0; r < this.R.length; r++) {
      if (!this.R[r].exits) {
        continue;
      }

      const E = this.R[r].exits;

      for (const e in E) {
        if (!this.rooms[E[e]]) {
          continue;
        }

        const d = {
          from: this.R[r],
          to: this.rooms[E[e]],
          z: this.R[r].z,
          e: e,
        };

        d.type = this.exitType(d);

        if (
          d.type === 'jump' &&
          d.from.zone !== d.to.zone &&
          this.at.num !== d.from.num
        ) {
          continue;
        }

        try {
          if (
            this.R[r].zone !== this.rooms[E[e]].zone &&
            this.areas[this.R[r].zone]?.notag !== 1 &&
            !zonetags.includes(this.R[r].zone)
          ) {
            this.tags.push({
              to: this.R[r],
              e: e,
            });
            zonetags.push(this.R[r].zone);
          }
        } catch (ex) {
          log('Error processing zone tags:', ex);
        }

        this.exits.push(d);
      }
    }
  }

  upload(o) {
    log('Mapper.upload data');
    let data;
    let n = 0;

    try {
      data = eval('(' + o.data + ')');
      if (!data.rooms) return "Data is missing a 'rooms' array.";
      if (!data.rooms.length)
        return "The 'rooms' object is not an array or is empty.";
      if (typeof data.rooms[0].num === 'undefined') {
        return "The 'rooms' array is missing the required 'num' field.";
      }
      if (o.test) return 'Input data passed all preliminary checks.';
    } catch (ex) {
      return ex;
    }

    j(`${this.id} .context #upload`).html('<div class="box-note"></div>');
    const status = j(`${this.id} .context #upload .box-note`);

    status
      .append('Parsed ' + data.rooms.length + ' rooms total.<br>')
      .scrollTop(status[0].scrollHeight);

    for (let r = data.rooms.length - 1; r >= 0; r--) {
      const R = data.rooms[r];

      if (!R.num) {
        data.rooms.splice(r, 1);
        continue;
      }

      if (this.rooms[R.num]) {
        if (o.skip && R.num !== data.start) {
          data.rooms.splice(r, 1);
          continue;
        } else if (o.overwrite) {
          delete this.rooms[R.num];
          continue;
        }
      }

      n++;
    }

    const t =
      'Successfully prepped ' + n + '/' + data.rooms.length + ' rooms.<br>';

    log('Mapper.upload:', t);

    status.css({ height: 240 }).niceScroll({
      cursorborder: 'none',
      touchbehavior: 1,
      cursorwidth: 2,
    });

    status.append(t).scrollTop(status[0].scrollHeight);

    if (data.rooms[0].x) {
      j(`${this.id} .context #upload .box-note`).html(t);

      status
        .append(
          'Suspended positioning (room coordinates detected).<br>Updating rooms... ',
        )
        .scrollTop(status[0].scrollHeight);

      for (let r = 0; r < data.rooms.length; r++) {
        n += this.update(data.rooms[r], 1);
      }

      status
        .append('Rooms updated: ' + n + '/' + data.rooms.length)
        .scrollTop(status[0].scrollHeight);

      return;
    }

    status.append('Positioning..<br>');
    let pass = 0;
    let passes = 0;
    let done = false;
    let result = 0;

    if (data.start) {
      const i = data.rooms.findIndex((r) => r.num === data.start);
      if (i > -1) {
        result = this.update(data.rooms[i], 1);
        if (result) {
          status
            .append('Added start room #' + data.start + ' to map.<br>')
            .scrollTop(status[0].scrollHeight);
          data.rooms.splice(i, 1);
          n++;
        } else {
          status
            .append(
              'Start room #' +
                data.start +
                ' could not be placed in relation to an existing room. Aborting.<br>',
            )
            .scrollTop(status[0].scrollHeight);
          return;
        }
      } else {
        status
          .append(
            'Start room #' +
              data.start +
              ' not found in room array - aborting.<br>',
          )
          .scrollTop(status[0].scrollHeight);
        return;
      }
    }

    while (!done) {
      pass = n;
      for (let r = 0; r < data.rooms.length; r++) {
        result = this.update(data.rooms[r], 1);
        if (result) {
          data.rooms.splice(r, 1);
          r--;
          n++;
          if (config.debug) {
            if (++passes % 10 === 0) {
              status
                .append(
                  'Pass #' +
                    passes +
                    ' | Rooms placed: ' +
                    n +
                    ' Remaining:' +
                    data.rooms.length +
                    '<br>',
                )
                .scrollTop(status[0].scrollHeight);
              if (config.debug) alert('pause');
            }
          }
        }
      }
      status
        .append(
          'Pass #' +
            ++passes +
            ' | Rooms placed: ' +
            n +
            ' Remaining:' +
            data.rooms.length +
            '<br>',
        )
        .scrollTop(status[0].scrollHeight);
      done = pass === n || !data.rooms.length;
    }
  }

  zoom(d) {
    log('Mapper.zoom:', d);

    if (d === 'in') {
      this.options.scale += 0.2;
    } else {
      this.options.scale -= 0.2;
    }

    if (this.options.scale > 6) this.options.scale = 6;
    if (this.options.scale < 0.4) this.options.scale = 0.4;

    this.initializeSvg();
  }

  stretch(r) {
    log('Mapper.stretch: canvas size check', stringify(r));

    let shiftX = 0;
    let shiftY = 0;
    let stretched = false;

    if (r.x < 100) {
      shiftX += 200;
      this.options.width += 200;
      stretched = true;
    } else if (r.x > this.options.width - 100) {
      this.options.width = r.x + 200;
      stretched = true;
    }

    if (r.y < 100) {
      shiftY += 200;
      this.options.height += 200;
      stretched = true;
    } else if (r.y > this.options.height - 100) {
      this.options.height = r.y + 200;
      stretched = true;
    }

    if (shiftX || shiftY) {
      for (const i in this.rooms) {
        if (this.rooms[i].x) this.rooms[i].x += shiftX;
        if (this.rooms[i].y) this.rooms[i].y += shiftY;
      }
    }

    if (stretched) {
      this.initializeSvg();
      this.go(this.at);
      log('Mapper.stretch: canvas stretch based on', stringify(r));
    }
  }

  zoneCheck(r) {
    r.zone = r.zone.split(' /')[0];
    const A = this.map.areas.findIndex((a) => a.name === r.zone);

    if (A === -1) {
      log('New area first seen.');

      const a = {
        name: r.zone,
        color: this.getZoneColor(),
      };

      this.map.areas.push(a);
      this.areas[r.zone] = a;
    }
  }

  update(r, auto) {
    if (!auto || config.debug) log('Mapper.update:', stringify(r));

    let to;
    const inside =
      r.terrain && r.terrain.toLowerCase().includes('inside') ? 1 : 0;

    if (j.isEmptyObject(this.rooms)) {
      log('Mapper.update: First ever room.');
      r.x = this.options.width / 2;
      r.y = this.options.height / 2;
      r.z = 0;
      this.rooms[r.num] = r;
      if (auto) return 1;
    }

    this.zoneCheck(r);

    if (this.rooms[r.num]) {
      if (!auto) log('Mapper.update: merge');

      delete this.rooms[r.num].exits;
      r = j.extend(true, this.rooms[r.num], r);

      if (!auto) log(stringify(r));

      this.svg
        .selectAll('#room_' + r.num)
        .attr(
          'title',
          this.options.nums || this.editing() ? r.num + ': ' + r.name : r.name,
        );

      if (r.zone) {
        j('.room_' + r.num)
          .removeClass('a_undefined')
          .addClass('a_' + this.escape(r.zone));
      }
    }

    if (!r.x || !r.y) delete r.via;
    else this.stretch(r);

    if (this.noexit(r) && !r.x) {
      log('Mapper.update: no-exit room');

      if (this.prev && this.prev.x) {
        r.x = this.prev.x + this.xOffset.e / 2;
        r.y = this.prev.y + this.yOffset.e / 2;
        r.z = this.prev.z;
      }

      this.rooms[r.num] = r;

      if (!auto) this.moveRoom(r);
      else {
        log(stringify(r));
        return 1;
      }
    } else {
      for (const e in r.exits) {
        const E = r.exits[e];

        if (E === r.num) {
          continue;
        } else if (!(to = this.rooms[E])) {
          if (r.x) {
            this.rooms[E] = {
              name: 'Unexplored',
              num: E,
              zone: r.zone,
              x: r.x + this.xOffset[e],
              y: r.y + this.yOffset[e],
              z: (() => {
                if (e === 'd') return r.z - 1;
                else if (e === 'u') return r.z + 1;
                else return r.z;
              })(),
            };

            if (
              this.rooms[E].x < 0 ||
              this.rooms[E].x > this.options.width ||
              this.rooms[E].y < 0 ||
              this.rooms[E].y > this.options.height
            ) {
              this.stretch(this.rooms[E]);
            }
            if (!auto) log('New unexplored:', stringify(this.rooms[E]));
            continue;
          }
        } else if (!to.x && r.x) {
          to.x = r.x + this.xOffset[e];
          to.y = r.y + this.yOffset[e];
          to.z = (() => {
            if (e === 'd') return r.z - 1;
            else if (e === 'u') return r.z + 1;
            else return r.z;
          })();
          if (!auto) {
            log('New neighbor prelim. coordinates:', stringify(to));
          }
        }

        if (!to || !to.x) continue;

        if (auto && r.x) return 1;

        if (typeof r.via !== 'undefined') continue;

        log('Placement via:\n' + stringify(to));

        r.via = to.num;

        let x_off = this.xOffset[e];
        let y_off = this.yOffset[e];

        if (e === 'd') r.z = to.z + 1;
        else if (e === 'u') r.z = to.z - 1;
        else {
          r.z = to.z;

          if (inside) {
            x_off = Math.floor(x_off * 0.5);
            y_off = Math.floor(y_off * 0.5);
          }
        }

        r.x = to.x - x_off;
        r.y = to.y - y_off;

        if (to.zone !== r.zone) r.trans = 1;

        this.rooms[r.num] = r;

        if (!auto) {
          this.moveRoom(r);
        } else {
          log(stringify(r));
          return 1;
        }
      }
    }

    if (!auto) this.go(r);
    else return 0;
  }

  path(to) {
    log('Mapper.path to: ' + stringify(to));
    let limit = 0;
    const h = [];
    const q = [[['@', this.at.num]]];

    while (q.length) {
      if (++limit > 500) {
        log('Mapper.path hit limit (500 iterations).');
        return null;
      }

      const p = q.shift();
      const n = p[p.length - 1];

      if (this.rooms[n[1]] && this.rooms[n[1]].exits) {
        const Ex = this.rooms[n[1]].exits;

        for (const e in Ex) {
          if (h.includes(Ex[e])) continue;

          const a = j.extend(true, [], p);
          a.push([e, Ex[e]]);
          if (Ex[e] === to.num) return a;
          q.push(a);
          h.push(Ex[e]);
        }
      }
    }
    return null;
  }

  go(r) {
    log('Mapper.go: ' + stringify(r));
    if (!r) return;

    if (!r.x && this.rooms[r.num]) {
      r = this.at = this.rooms[r.num];
    }

    if (r.x) {
      const x = r.x * this.options.scale - j(this.container).width() / 2;
      const y = r.y * this.options.scale - j(this.container).height() / 2;
      log('Mapper.go: scroll to: x' + x + ' y' + y);
      j(this.container).scrollLeft(x).scrollTop(y);
      log(
        'Mapper.go: scrolled to: x' +
          j(this.container).scrollLeft() +
          ' y' +
          j(this.container).scrollTop(),
      );
    }
  }

  context() {
    if (!j('.mapper .context').length) {
      j('.mapper').prepend("<div class='context context-top'><ul></ul></div>");
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip dir" title="Nudge selected left (west)." data="w"><i class="icon-angle-left"></i></li>',
      );
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip dir" title="Nudge selected up (north)." data="n"><i class="icon-angle-up"></i></li>',
      );
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip dir" title="Nudge selected down (south)." data="s"><i class="icon-angle-down"></i></li>',
      );
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip dir" title="Nudge selected right (east)." data="e"><i class="icon-angle-right"></i></li>',
      );
      //j('.mapper .context-top ul').append('<li class="kbutton tip trans" style="display: none" title="Move room to adjacent area."><i class="icon-external-link"></i></li>');
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip road" title="Flag selection as road (always shown)."><i class="icon-road"></i></li>',
      );
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip dungeon" title="Flag area as dungeon (not shown unless inside)."><i class="icon-th"></i></li>',
      );
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip reveal" title="Reveal all rooms in map window."><i class="icon-eye-open"></i></li>',
      );
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip forget" title="Forget (remove) selected."><i class="icon-remove"></i></li>',
      );
      //j('.mapper .context-top ul').append('<li class="kbutton tip download" title="Download room data."><i class="icon-download-alt"></i></li>');
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip upload" title="Upload room data."><i class="icon-upload-alt"></i></li>',
      );
      j('.mapper .context-top ul').append(
        '<li class="kbutton tip save" title="Save latest map data."><i class="icon-save"></i></li>',
      );
      //j('.mapper .context-top ul').append('<li class="kbutton tip relay" title="Re-layout selected."><i class="icon-refresh"></i></li>');
    } else {
      j('.mapper .context').remove();
      j('.mapper .context .trans').hide();
      this.selection = [];
    }
  }
}

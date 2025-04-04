/* eslint-disable no-control-regex */
import { config, MU_CHANNELS } from './config.js';
import { Event } from './event.js';
import { Colorize } from './colorize.js';
import { log, stringify } from './utils.js';

import {
  Base64Reader,
  Utf8Translator,
  TextReader,
  Inflator,
  CharReader,
} from './lib/inflate.js';
import { ZLIB } from './lib/zlib-inflate.js';

export class Socket {
  constructor(options) {
    this.options = {
      type: 'telnet',
      ...options,
    };

    this.ws = {};
    this.out = options.out || config.ScrollView;
    this.connected = false;
    this.proxy = config.proxy;
    this.host = options.host;
    this.port = options.port;
    this.buffer = '';
    this.zlibState = {
      lib: null,
      stream: null,
      raw: null,
    };
    this.utf8 = false;
    this.colorize = new Colorize();
    this.commands = [];
    this.commandIndex = 0;
    // this.echo = true;
    this.keepCommand = config.getSetting('keepcom') ?? true;

    if (this.proxy?.includes('maldorne')) {
      delete this.options.proxy;
    }

    // Initialize socket
    this.initializeSocket();

    if (this.options.type === 'telnet') {
      config.socket = config.Socket = this;
    }
  }

  static PROTOCOL = {
    IS: 0,
    REQUEST: 1,
    ACCEPTED: 2,
    REJECTED: 3,
    TTYPE: 24,
    ESC: 33,
    CHARSET: 42,
    MCCP2: 86,
    MSDP: 69,
    MXP: 91,
    WILL: 251,
    ATCP: 200,
    GMCP: 201,
    SE: 240,
    SB: 250,
    WONT: 252,
    DO: 253,
    DONT: 254,
    IAC: 255,
  };

  handleOpen = (event) => {
    log('Socket: connected');
    this.connected = true;

    if (!this.options.proxy && this.options.type === 'telnet') {
      this.ws.send(
        stringify({
          host: this.options.host,
          port: this.options.port,
          utf8: 1,
          mxp: 1,
          connect: 1,
          mccp: config.device.mobile ? 0 : 1,
          debug: config.debug,
          client: this.options.client,
          ttype: this.options.ttype,
          name: window.user?.username || 'Guest',
        }),
      );
    }

    if (this.options.onOpen) {
      this.options.onOpen(event);
    }

    if (this.options.type === 'telnet') {
      Event.fire('socket_open', this);
    }

    Event.fire(`${this.options.type}_open`, this);
  };

  handleClose = (event) => {
    Event.fire('socket_before_close', this);
    this.ws.close();
    this.connected = false;
    this.zlibState.lib = false;

    if (this.zlibState.stream) {
      ZLIB.inflateEnd(this.zlibState.stream);
    }

    if (this.out) {
      this.out.add(
        '<br><span style="color: green;">Remote server has disconnected. Refresh page to reconnect.</span><br>',
      );
    }

    if (this.options.onClose) {
      this.options.onClose(event);
    }

    Event.fire('socket_close', this);
    Event.fire(`${this.options.type}_close`, this);
    log('Socket: closed');
  };

  handleError = () => {
    this.out?.add(
      '<span style="font-size: 12px; color: red;">Error: telnet proxy may be down.</span><br>',
    );
  };

  handleMessage = (event) => {
    if (this.options.type === 'chat') {
      log('Socket.onMessage chat_data');
      Event.fire(`${this.options.type}_data`, event.data);
      return;
    }

    let data = event.data;
    if (Event.q.socket_data) {
      data = Event.fire('socket_data', data, this);
      if (!data) return;
    }

    this.processIncomingData(data);
  };

  async processIncomingData(data) {
    log('process incoming data', data);

    // Handle Blob data
    if (data instanceof Blob) {
      try {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(data);
        });
        data = text;
      } catch (error) {
        log('Error reading Blob:', error);
        return;
      }
    }

    if (config.uncompressed) {
      // just pass the information, as it is not compressed
      this.buffer += data;

      return this.process();
    }

    if (config.base64) {
      try {
        var bits = new Base64Reader(data);
        var translator = new Utf8Translator(bits);
        var reader = new TextReader(translator);
        this.buffer += reader.readToEnd();
      } catch (error) {
        log('Attempt to base64-decode failed:', error);
        this.buffer += data;
      }

      return this.process();
    }

    if (!this.zlibState.lib) {
      try {
        let bits = new Base64Reader(data);
        let inflator = new Inflator(bits);
        let translator = new Utf8Translator(inflator);
        let reader = new TextReader(translator);
        this.buffer += reader.readToEnd();
      } catch {
        this.zlibState.lib = 1;
        log('Attempting zlib stream decompression (MCCP).');
      }
    }

    if (this.zlibState.lib) {
      try {
        let b,
          bits = new Base64Reader(data);
        this.zlibState.raw = '';

        while ((b = bits.readByte()) != -1)
          this.zlibState.raw += String.fromCharCode(b);

        if (!this.zlibState.stream) this.zlibState.stream = ZLIB.inflateInit();

        this.zlibState.raw = this.zlibState.stream.inflate(this.zlibState.raw);

        let char = new CharReader(this.zlibState.raw);
        let translator = new Utf8Translator(char);
        let reader = new TextReader(translator);
        this.buffer += reader.readToEnd();
      } catch (error) {
        log('ZLIB processing failed:', error);
      }
    }

    this.process();
  }

  initializeSocket() {
    log(`Socket: setting websocket proxy to ${this.proxy}`);
    log('Socket: connecting');

    this.ws = new WebSocket(this.proxy);
    this.ws.onopen = this.handleOpen;
    this.ws.onclose = this.handleClose;
    this.ws.onmessage = this.handleMessage;
    this.ws.onerror = this.handleError;

    window.onbeforeunload = () => {
      this.ws.onclose = null;
      this.ws.close();
    };
  }

  send(message) {
    message = message.trim();
    message = Event.fire('before_send', message, this);

    if (
      !message.includes('macro') &&
      !message.includes('alias') &&
      !message.includes('trig') &&
      config.separator.length
    ) {
      const separator = new RegExp(config.separator, 'g');
      message = message.replace(separator, '\r\n');
    }

    if (this.ws.send && this.connected) {
      this.out?.echo(message);

      if (config.useMuProtocol) {
        message = MU_CHANNELS.TEXT + message;
      }

      log(`Socket.send: ${message}`);
      this.ws.send(message + '\r\n');
    } else if (this.out) {
      this.out.add(
        '<span style="font-size: 12px; color: green;">WARNING: please connect first.<br></span>',
      );
    }

    return this;
  }

  sendBinary(message) {
    if (!this.connected) {
      log('attempt to sendBin before socket connect');
      return this;
    }
    log(`Socket.sendBin: ${message}`);
    this.ws.send(stringify({ bin: message }));
    return this;
  }

  sendMSDP(message) {
    if (!this.connected) {
      log('attempt to sendMSDP before socket connect');
      return this;
    }
    log(`Socket.sendMSDP: ${stringify(message)}`);
    this.ws.send(stringify({ msdp: message }));
    return this;
  }

  sendGMCP(message) {
    if (!this.connected) {
      log('attempt to sendGMCP before socket connect');
      return this;
    }
    this.ws.send(stringify({ gmcp: message }));
    return this;
  }

  process(force = false) {
    if (!this.buffer.length) return;

    let content = this.buffer;
    this.buffer = '';

    content = this.prepareContent(content, force);

    if (content) {
      this.out.add(content);
      Event.fire('after_display', content);
    }
  }

  prepareContent(text, force = false) {
    let t = text;
    // let buff = '';

    /* prevent split oob data */
    if (t.match(/\xff\xfa[^\xff\xf0\x01]+$/) && !force) {
      log('protocol split protection waiting for more input.');
      this.buffer = t;
      setTimeout(() => this.process(true), 1000);
      return;
    }

    if (config.mxp?.enabled) {
      const mxp = t.match(/\x1b\[[1-7]z/g);

      if (mxp && mxp.length % 2 && !force) {
        log('mxp split protection waiting for more input: ' + mxp.length);
        log(t);
        this.buffer = t;
        return;
      }
    }

    if (t.match(/\x1b\[[^mz]+$/) && !force) {
      log('ansi split protection is waiting for more input.');
      this.buffer = t;
      setTimeout(() => this.process(true), 500);
      return;
    }

    if (t.match(/<dest/i) && !force) {
      if (
        !t.match(/<\/dest/i) ||
        t.match(/<dest/gi)?.length !== t.match(/<\/dest/gi)?.length
      ) {
        this.buffer = t;
        return;
      }
    }

    // if (!t.includes('portal.chatlog')) {
    //   log(t);
    // }

    t = Event.fire('before_process', t);

    // Add MU*-specific protocol detection
    if (config.useMuProtocol) {
      // normal text messages
      if (t.startsWith(MU_CHANNELS.TEXT)) {
        t = t.substring(MU_CHANNELS.TEXT.length);
      } else if (t.startsWith(MU_CHANNELS.JSON)) {
        // json messages, probably gmpc?
        t = t.substring(MU_CHANNELS.JSON.length);
        Event.fire('gmcp', t);
        return;
      } else if (t.startsWith(MU_CHANNELS.PUEBLO)) {
        // pueblo messages, don't know what to do with them yet
        t = t.substring(MU_CHANNELS.PUEBLO.length);
        Event.fire('pueblo', t);
        return;
      }
    }

    if (t.includes('\xff\xfb\x45')) {
      /* IAC WILL MSDP */
      log('Got IAC WILL MSDP');
      Event.fire('will_msdp', this);
      t = t.replace(/\xff\xfb\x45/, '');
    }

    if (t.includes('\xff\xfb\xc9')) {
      /* IAC WILL GMCP */
      log('Got IAC WILL GMCP');
      Event.fire('will_gmcp', this);
      t = t.replace(/\xff\xfb\xc9/, '');
    }

    // Add debug logging for control characters
    // const chars = Array.from(t.substring(0, 10)).map((char) => ({
    //   char: char,
    //   code: char.charCodeAt(0),
    //   hex: char.charCodeAt(0).toString(16),
    // }));
    // log('incoming data characters:', chars[0]);

    if (t.includes('\xff\xfaE')) {
      const m = t.match(/\xff\xfaE([^]+?)\xff\xf0/gm);
      if (m?.length) {
        for (let i = 0; i < m.length; i++) {
          let d = m[i].substring(4, m[i].length - 2);
          log('detected & parsing msdp: ');
          d = d
            .replace('/\x01/g', 'MSDP_VAL')
            .replace('/\x03/g', 'MSDP_TABLE_OPEN')
            .replace('/\x04/g', 'MSDP_TABLE_CLOSE')
            .replace('/\x05/g', 'MSDP_ARRAY_OPEN')
            .replace('/\x06/g', 'MSDP_ARRAY_CLOSE')
            .split('\x02');
          log(d);
          Event.fire('msdp', d);
          t = t.replace(m[i], '');
        }
      }
    }

    if (!this.utf8 && t.includes('ÿú* UTF-8ÿð')) {
      this.utf8 = true;
      log('UTF-8 enabled.');
      t = t.replace(/ÿú.. UTF-8../, '');
    }

    /* gmcp */
    if (t.includes('\xff\xfa\xc9')) {
      const m = t.match(/\xff\xfa\xc9([^]+?)\xff\xf0/gm);
      if (m?.length) {
        for (let i = 0; i < m.length; i++) {
          const d = m[i].substring(3, m[i].length - 2);
          log('detected gmcp');
          Event.fire('gmcp', d);
          t = t.replace(m[i], '');
        }
      }
      /* avoid splitting gmcp */
      if (t.includes('\xff\xfa\xc9')) {
        this.buffer = t;
        return '';
      }
    }

    /* atcp */
    if (t.includes('\xff\xfa\xc8')) {
      const m = t.match(/\xff\xfa\xc8([^]+?)\xff\xf0/gm);
      if (m?.length) {
        for (let i = 0; i < m.length; i++) {
          const d = m[i].substring(3, m[i].length - 2);
          log('detected atcp:' + d);
          Event.fire('atcp', d);
          t = t.replace(m[i], '');
        }
      }
    }

    if (t.includes('\xff\xfb\x5b') && config.base64) {
      this.ws.send('\xff\xfd\x5b');
    }

    if (t.includes('\xff\xfb\x01')) {
      log('IAC WILL ECHO');
      config.ScrollView?.echoOff();
      t = t.replace(/\xff.\x01/g, '');
    }

    if (t.includes('\xff\xfc\x01')) {
      log('IAC WONT ECHO');
      config.ScrollView?.echoOn();
      t = t.replace(/\xff.\x01/g, '');
    }

    t = Event.fire('internal_mxp', t);
    t = Event.fire('after_protocols', t, this);

    if (t.includes('\x01') && config.debug) {
      log('Unhandled IAC sequence:');
      const seq = Array.from(t).map((char) => char.charCodeAt(0));
      log(seq);
    }

    if (t.includes('\x07')) {
      new Audio('/app/sound/ding.mp3').play();
    }

    t = t
      .replace(/([^\x1b])</g, '$1&lt;')
      .replace(/([^\x1b])>/g, '$1&gt;')
      .replace(/\x1b>/g, '>')
      .replace(/\x1b</g, '<');

    t = Event.fire('before_html', t, this);
    t = t.replace(
      /([^"'])(http.*:\/\/[^\s\x1b"']+)/g,
      '$1<a href="$2" target="_blank">$2</a>',
    );
    t = Event.fire('internal_colorize', t, this);

    t = t
      .replace(/\xff\xfa.+\xff\xf0/g, '')
      .replace(/\xff(\xfa|\xfb|\xfc|\xfd|\xfe)./g, '')
      .replace(/\x07/g, '') //bell
      .replace(/\x1b\[1;1/g, '') //clear screen, ignore for now
      .replace(/([ÿùïð])/g, '')
      .replace(/\x1b\[[A-Z0-9]/gi, '') //erase unsupported ansi control data
      .replace(';0;37', '') //erase unsupported ansi control data
      .replace(/\uFFFF/gi, '') // utf-8 non-character
      .replace(/\n\r/g, '\n')
      .replace(/\r\n/g, '\n');

    /* orphaned escapes still possible during negotiation */
    if (t.match(/^\x1b+$/)) return '';

    return Event.fire('before_display', t);
  }

  reconnect() {
    if (this.connected) {
      this.ws.onclose = null;
      this.ws.close();
    }

    this.buffer = '';
    config.mxp.disable();
    this.initializeSocket();
  }

  type() {
    return this.options.type;
  }

  write(data) {
    if (this.connected) {
      log(`Socket.write: ${data}`);
      this.send(data);
    }
  }

  getProxy() {
    return this.proxy;
  }

  getSocket() {
    return this.ws;
  }

  connected() {
    return this.connected;
  }

  echo(msg) {
    if (this.out) {
      this.out.echo(msg);
    }
  }

  // createInterface() {
  //   return {
  //     send: (msg) => this.send(msg),
  //     sendBin: (msg) => this.sendBinary(msg),
  //     sendMSDP: (msg) => this.sendMSDP(msg),
  //     sendGMCP: (msg) => this.sendGMCP(msg),
  //     echo: (msg) => this.out?.echo(msg),
  //     type: () => this.options.type,
  //     write: (data) => {
  //       if (this.connected) {
  //         this.ws.send(data + '\r\n');
  //         log(`Socket.write: ${data}`);
  //       }
  //     },
  //     getProxy: () => this.proxy,
  //     getSocket: () => this.ws,
  //     connected: () => this.connected,
  //     reconnect: () => this.reconnect(),
  //     process: () => this.process(),
  //   };
  // }
}

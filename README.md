# mud-web-client

### What is this?

Webapp to connect to a [MUD](https://en.wikipedia.org/wiki/MUD) / MUSH / MOO game server, supporting all major data interchange and interactive text protocols. The connection is done through a secure websocket (`wss://` protocol), so you will need a proxy in the server that _translates_ the `wss` sessions to `telnet`. You can use the [`mud-web-proxy`](https://github.com/houseofmaldorne/mud-web-proxy) project to achieve that.

### History

This project is a fork of [MUDPortal-Web-App](https://github.com/plamzi/MUDPortal-Web-App), made by [@plamzi](https://github.com/plamzi), creator of [mudportal.com](http://www.mudportal.com/). The original project had the code of both the client and proxy-server apps, and was outdated and did not support secure connections (`wss://` instead of `ws://`), so I decided to fork it, separate in different projects and update them. But kudos to [@plamzi](https://github.com/plamzi), who is the original author.

### Motivation

In modern browsers, web-pages served through `https://` are not allowed to open connections to non-secure locations, so an `https://`-served web could not include a web client which opens a connection using `ws://`. Modifications were needed to allow secure connections.

## Features

* Window-based web UI with draggable and resizable windows, window toolbar.

* MCCP compression support (zlib)

* MXP protocol support built into the client

* MSDP protocol support

* GMCP / ATCP protocol support (JSON) with sample uses in multiple existing plugins

* 256-color support, including background colors

* Unicode font support and UTF-8 negotiation

* Vector-based world mapper with flexible edit mode to allow for mapping any MUD world via exploration

* Triggers / macros / command memory with typeahead

## Installation

``` bash
git clone https://github.com/houseofmaldorne/mud-web-client
npm install
```

* Copy all files to a web-accessible folder on your web server.

* Point a browser at the root of the folder to load the included `index.html` file.

## Configuration

In `src/config.js` you can change the following options, among others:

``` javascript
  debug: param('debug') || 0,
  host: param('host') || 'muds.maldorne.org',
  port: param('port') || '5010',
  name: param('name') || 'House of Maldorne',
  ...
  proxy: 'wss://play.maldorne.org:6200/',
  ...
```

These are the default values used when the client does not receive specific parameters. You have to specify:
 * host: Your hostname. `localhost` or `127.0.0.1` don't seem to work: [see conversation here](https://github.com/houseofmaldorne/mud-web-proxy/issues/5#issuecomment-866464161).
 * port: The port where the mud is running. The mud, **not** the proxy.
 * proxy: The `wss` url where [the proxy](https://github.com/houseofmaldorne/mud-web-proxy) is running.

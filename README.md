# mud-web-client

### What is this?

Webapp to connect to a [MUD](https://en.wikipedia.org/wiki/MUD) / MUSH / MOO game server, supporting all major data interchange and interactive text protocols. The connection is done through a secure websocket (`wss://` protocol), so you will need a proxy in the server that _translates_ the `wss` sessions to `telnet`. You can use the [`mud-web-proxy`](https://github.com/maldorne/mud-web-proxy) project to achieve that.

You can see this project working in the [maldorne.org](https://maldorne.org/play/) web page.

### History

This project is a fork of [MUDPortal-Web-App](https://github.com/plamzi/MUDPortal-Web-App), made by [@plamzi](https://github.com/plamzi), creator of [mudportal.com](http://www.mudportal.com/). The original project had the code of both the client and proxy-server apps, and was outdated and did not support secure connections (`wss://` instead of `ws://`), so I decided to fork it in 2020, separate in different projects and update them. But kudos to [@plamzi](https://github.com/plamzi), who is the original author.

In 2025, I've ported the project to use ES modules, and the build system is now based on [Vite](https://vitejs.dev/). The project is now using the latest version of the libraries, and the code is cleaner and easier to maintain. 

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

## Configuration

``` bash
git clone https://github.com/maldorne/mud-web-client
npm install
```

### MUD Configuration Files

The client now supports JSON configuration files for different MUDs. Create a file in the `muds/` directory for each MUD you want to configure:

```json
{
  "name": "Example MUD",
  "host": "muds.example.org",
  "port": "5010",
  "proxy": "wss://play.example.org:6200/",

  "other configuration options, see muds/example.json or muds/ciudad-capital.json for more examples"
}
```

Key configuration options:
  - `name`: Display name of the MUD.
  - `host`: MUD server hostname.
  - `port`: MUD server port, The mud, **not** the proxy.
  - `proxy`: WebSocket proxy URL. The `wss` url where [the proxy](https://github.com/maldorne/mud-web-proxy) is running.

To use a specific MUD configuration, add the `mud` parameter to the URL:

`http://localhost:5173/?mud=example-mud`

URL parameters will override values from the JSON config file. For example:

`http://localhost:5173/?mud=example-mud&debug=1&chatterbox=1`

After changing configuration values, you can rebuild the project with `npm run build` and copy the files in the `/dist` directory to your web server, as it is explained below.

### Default Configuration

The values in `src/config.js` are now used as fallbacks when:
  - No MUD is specified in the URL
  - A specified MUD configuration file is not found
  - Specific fields are missing in the MUD configuration

## Usage

### In your local environment

  * Run `npm run dev` to start a local web server. The web client will be available at `http://localhost:5173/`.

### For deployment on a web server

  * If you make changes (even only in a JSON configuration file), you can run `npm run build` to generate the new files in the `/dist` directory.
  * Copy all files inside the `/dist` directory to a web-accessible directory on your web server. Files _must_ be served by a web server, it won't work if you just open the `index.html` file in your browser. Most code editors have plugins to run a local web server to test these kind of things.
  * Point a browser at the root of that directory to load the included `index.html` file.

## Changelog

  * v1 ([@plamzi](https://github.com/plamzi)): Original version [MUDPortal-Web-App](https://github.com/plamzi/MUDPortal-Web-App).
  * v2 ([@neverbot](https://github.com/neverbot)): Added support for `wss://` connections. Separated the client and [proxy-server code](https://github.com/maldorne/mud-web-proxy).
  * v3 ([@neverbot](https://github.com/neverbot)): Ported to ES modules and Vite. Updated all dependencies. 

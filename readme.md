# mud-web-client

### What is this?

A web-based [MUD](https://en.wikipedia.org/wiki/MUD) / MUSH / MOO game client built with [Vue 3](https://vuejs.org/) and [xterm.js](https://xtermjs.org/). It connects to MUD game servers through a WebSocket-to-Telnet proxy ([`mud-web-proxy`](https://github.com/maldorne/mud-web-proxy)), rendering terminal output with full ANSI color support.

You can see this project working in the [maldorne.org](https://maldorne.org/play/) web page.

### History

This project was originally a fork of [MUDPortal-Web-App](https://github.com/plamzi/MUDPortal-Web-App), made by [@plamzi](https://github.com/plamzi), creator of [mudportal.com](http://www.mudportal.com/). The original project contained both the web client and proxy server in a single repository. In 2020, [@neverbot](https://github.com/neverbot) forked and split them into separate projects, adding support for secure connections (`wss://` instead of `ws://`). Kudos to [@plamzi](https://github.com/plamzi), whose original work made this project possible.

In 2025, the project was ported to ES modules with a Vite build system, and all dependencies were updated to their latest versions, modernizing the codebase while keeping the original jQuery-based architecture.

In 2026, the project was rewritten from scratch using Vue 3, TypeScript, and xterm.js. This is no longer a fork — it is a completely new implementation designed for modern browsers, with a clean component architecture, proper telnet protocol parsing, and Docker support for deployment in a cluster behind a reverse proxy like Traefik.

### Motivation

In modern browsers, web pages served through `https://` are not allowed to open connections to non-secure endpoints. An `https://`-served page cannot use plain `ws://` WebSockets. This client connects via `wss://` to the proxy, which bridges the gap to raw TCP/Telnet MUD servers.

## Features

  * Terminal rendering with [xterm.js](https://xtermjs.org/) (the same terminal used by VS Code)
  * Full ANSI color support (16 colors, 256 colors, true color)
  * Scrollback buffer (10,000 lines)
  * Command input with history (up/down arrows)
  * Command separator support (`;` splits into multiple commands)
  * Password mode (hidden input when server sends IAC WILL ECHO)
  * Clickable URLs in terminal output
  * GMCP protocol support (bidirectional)
  * MSDP protocol support
  * MXP protocol support
  * Bell character support (audible notification)
  * Telnet IAC sequence parsing and handling
  * Named route support for Docker cluster deployments
  * Legacy host:port routing for standalone MUD servers
  * Responsive layout (works in 800x600 iframe and fullscreen)
  * Multi-stage Docker build (node:20-alpine + nginx:alpine)
  * Query parameter configuration (no config files needed)

## Installation

### Standalone

```bash
git clone https://github.com/maldorne/mud-web-client
cd mud-web-client
npm install
npm run dev
```

The client will be available at `http://localhost:5173/`.

### Docker (local development)

```bash
docker compose -f docker-compose.dev.yml up --build
```

The client will be available at `http://localhost:8080/`.

### Docker (cluster with Traefik)

Add the client service to your `docker-compose.yml`:

```yaml
mud-web-client:
  container_name: mud-web-client
  image: ghcr.io/maldorne/mud-web-client:latest
  restart: unless-stopped
  networks:
    - maldorne-network
  labels:
    - traefik.enable=true
    - traefik.http.routers.mud-client.rule=Host(`play.maldorne.org`)
    - traefik.http.routers.mud-client.entrypoints=websecure
    - traefik.http.routers.mud-client.tls.certresolver=myresolver
    - traefik.http.services.mud-client.loadbalancer.server.port=80
```

## Configuration

All configuration is done through URL query parameters. No config files or environment variables are needed.

| Parameter   | Default                          | Description                              |
| ----------- | -------------------------------- | ---------------------------------------- |
| `proxy`     | `wss://play.maldorne.org:6200/`  | WebSocket proxy URL                      |
| `host`      | `muds.maldorne.org`              | MUD server host (legacy routing)         |
| `port`      | `5010`                           | MUD server port (legacy routing)         |
| `mud`       | —                                | Named route for cluster MUDs             |
| `name`      | `Guest`                          | Player display name                      |
| `ttype`     | `maldorne.org`                   | Terminal type sent to MUD                |
| `debug`     | `0`                              | Enable debug mode (`1` to enable)        |
| `separator` | `;`                              | Command separator character              |

### Examples

Connect to a named MUD in the cluster:
```
https://play.maldorne.org/?mud=iluminado
```

Connect to a specific host and port:
```
https://play.maldorne.org/?port=5030
```

Embedded in a blog iframe:
```html
<iframe src="https://play.maldorne.org/?port=5030" width="800" height="600"></iframe>
```

## Development

```bash
npm run dev        # Vite dev server at localhost:5173
npm run build      # TypeScript check + production build to /dist
npm run preview    # Preview production build
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
```

## Architecture

The client is built with Vue 3 Composition API and TypeScript:

- `src/main.ts` — App entry point
- `src/App.vue` — Root component, wires socket + parser + terminal
- `src/components/MudTerminal.vue` — xterm.js terminal wrapper with command input
- `src/composables/useSocket.ts` — WebSocket connection management, proxy protocol
- `src/composables/useTelnetParser.ts` — IAC sequence extraction, GMCP/MSDP/MXP parsing
- `src/composables/useConfig.ts` — Query parameter parsing, defaults
- `src/types/index.ts` — TypeScript interfaces and telnet constants

The legacy jQuery client is preserved in `legacy/` for reference.

## Changelog

  * v1 ([@plamzi](https://github.com/plamzi)): Original version, part of [MUDPortal-Web-App](https://github.com/plamzi/MUDPortal-Web-App).
  * v2 ([@neverbot](https://github.com/neverbot)): Forked, separated client and proxy. Added `wss://` support.
  * v3 ([@neverbot](https://github.com/neverbot)): Ported to ES modules and Vite. Updated all dependencies.
  * v4 ([@neverbot](https://github.com/neverbot)): Full rewrite with Vue 3, TypeScript, and xterm.js. Docker support, telnet protocol parser, responsive layout.

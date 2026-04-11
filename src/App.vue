<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import MudTerminal from '@/components/MudTerminal.vue';
import { useConfig } from '@/composables/useConfig';
import { useSocket } from '@/composables/useSocket';
import { useTelnetParser } from '@/composables/useTelnetParser';
import { GoldenLayoutAdapter } from '@/layouts/GoldenLayoutAdapter';
import { fullLayout, saveLayoutToStorage } from '@/layouts/defaultLayouts';
import TerminalPanel from '@/panels/TerminalPanel.vue';
import InfoPanel from '@/panels/InfoPanel.vue';

import 'golden-layout/dist/css/goldenlayout-base.css';
import 'golden-layout/dist/css/themes/goldenlayout-dark-theme.css';

const { config } = useConfig();
const socket = useSocket(config);
const parser = useTelnetParser();

/* ── Shared state between golden-layout panels ── */
const sharedState = reactive<Record<string, unknown>>({
  terminal: null,
  passwordMode: false,
  gmcpLog: [] as string[],
  onCommand: (raw: string) => onCommand(raw),
});

/* ── Refs ─────────────────────────────────────── */
const embedTerminalRef = ref<InstanceType<typeof MudTerminal> | null>(null);
const layoutRootRef = ref<HTMLElement | null>(null);
let adapter: GoldenLayoutAdapter | null = null;

const isEmbed = config.mode === 'embed';

/* ── Terminal accessor (works in both modes) ──── */
function getTerminal() {
  if (isEmbed) return embedTerminalRef.value;
  return sharedState.terminal as InstanceType<typeof MudTerminal> | null;
}

/* ── Bell sound ───────────────────────────────── */
let bellAudio: HTMLAudioElement | null = null;
parser.onBell(() => {
  if (!bellAudio) {
    bellAudio = new Audio('data:audio/wav;base64,UklGRl9vT19teleVBFTVQAAAAA');
  }
  bellAudio.play().catch(() => {
    /* autoplay may be blocked */
  });
});

/* ── GMCP events ──────────────────────────────── */
parser.onGmcp((event) => {
  const log = sharedState.gmcpLog as string[];
  log.push(`${event.module}: ${JSON.stringify(event.data)}`);
  if (log.length > 200) log.splice(0, log.length - 200);

  if (config.debug) {
    getTerminal()?.writeln(
      `\x1b[36m[GMCP] ${event.module}: ${JSON.stringify(event.data)}\x1b[0m`,
    );
  }
});

/* ── Data from proxy → parse → terminal ───────── */
socket.onData((raw) => {
  const clean = parser.parse(raw);
  if (clean) {
    getTerminal()?.write(clean);
  }
  sharedState.passwordMode = parser.passwordMode.value;
});

socket.onClose(() => {
  getTerminal()?.writeln(
    '\r\n\x1b[32mConnection closed. Refresh to reconnect.\x1b[0m',
  );
});

/* ── Command handling ─────────────────────────── */
function onCommand(raw: string) {
  const separator = config.separator;
  let commands: string[];

  if (separator && raw.includes(separator)) {
    commands = raw.split(separator).map((c) => c.trim());
  } else {
    commands = [raw];
  }

  for (const cmd of commands) {
    if (!parser.passwordMode.value) {
      getTerminal()?.writeln(`\x1b[33m${cmd}\x1b[0m`);
    }
    socket.send(cmd);
  }
}

/* ── Lifecycle ────────────────────────────────── */
onMounted(async () => {
  if (!isEmbed) {
    await nextTick();
    if (!layoutRootRef.value) return;

    adapter = new GoldenLayoutAdapter(layoutRootRef.value, sharedState);
    adapter.registerComponent('Terminal', TerminalPanel);
    adapter.registerComponent('Info', InfoPanel);

    // TODO: restore saved layout once golden-layout is stable
    // const saved = loadLayoutFromStorage();
    adapter.loadLayout(fullLayout);

    adapter.layout.on('stateChanged', () => {
      if (adapter) saveLayoutToStorage(adapter.saveLayout());
    });

    await nextTick();
  }

  getTerminal()?.writeln('\x1b[32mConnecting to proxy...\x1b[0m');
  socket.connect();
});

onBeforeUnmount(() => {
  socket.disconnect();
  adapter?.destroy();
});
</script>

<template>
  <!-- Embed mode: simple terminal, no golden layout -->
  <div
    v-if="isEmbed"
    class="app-embed"
    @click="embedTerminalRef?.focusInput()"
  >
    <MudTerminal
      ref="embedTerminalRef"
      :password-mode="parser.passwordMode.value"
      @command="onCommand"
    />
    <div v-if="socket.error.value" class="error-bar">
      {{ socket.error.value }}
    </div>
  </div>

  <!-- Full mode: golden layout with panels -->
  <div v-else class="app-full">
    <div ref="layoutRootRef" class="layout-root"></div>
    <div v-if="socket.error.value" class="error-bar">
      {{ socket.error.value }}
    </div>
  </div>
</template>

<style>
/* Global reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #fff;
}

#app {
  height: 100%;
  width: 100%;
}

/*
 * Golden Layout theme — maldorne.org light
 *
 * Matches the Hexo blog at maldorne.org:
 *   font:        Source Sans Pro, 400, ~17px
 *   text:        #363636
 *   secondary:   #767676
 *   background:  #fff
 *   border:      #e8e8e8
 *   accent:      #2d96bd
 *   accent-hover: #ef3982 (pink, used for post link hover)
 */
:root {
  --panel-bg: #fff;
  --panel-fg: #363636;
  --accent: #2d96bd;
  --accent-hover: #ef3982;
  --border: #e8e8e8;
}

.lm_goldenlayout {
  background: #f5f5f5 !important;
}

.lm_header {
  background: #fff !important;
  border-bottom: 1px solid #e8e8e8 !important;
}

.lm_header .lm_tab {
  background: #fff !important;
  color: #767676 !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  font-family: 'Source Sans Pro', sans-serif !important;
  font-size: 15px !important;
  font-weight: 400 !important;
  padding: 0 12px !important;
  margin: 0 !important;
  height: 100% !important;
  line-height: 34px !important;
  display: inline-flex !important;
  align-items: center !important;
  transition: color 0.2s ease !important;
}

.lm_header .lm_tab.lm_active {
  background: #fff !important;
  color: #363636 !important;
  border-bottom: 2px solid #2d96bd !important;
}

.lm_header .lm_tab:hover {
  color: #2d96bd !important;
}

.lm_splitter {
  background: #e8e8e8 !important;
}

.lm_splitter:hover {
  background: #2d96bd !important;
}

.lm_content {
  background: #fff !important;
  border: none !important;
}

.lm_controls .lm_close {
  background-color: transparent !important;
}

.lm_controls .lm_close:hover {
  opacity: 0.6 !important;
}

.lm_dragProxy .lm_content {
  background: #fff !important;
  box-shadow:
    rgba(0, 0, 0, 0.1) 0px 4px 16px 0px,
    rgba(0, 0, 0, 0.08) 0px 1px 3px 0px !important;
}

.lm_dropTargetIndicator {
  outline: 2px solid #2d96bd !important;
  background: rgba(45, 150, 189, 0.1) !important;
}
</style>

<style scoped>
.app-embed {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.app-full {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.layout-root {
  flex: 1;
  min-height: 0;
}

.error-bar {
  background: #fef2f2;
  color: #c7254e;
  padding: 8px 16px;
  font-family: 'Source Sans Pro', sans-serif;
  font-size: 14px;
  text-align: center;
  flex-shrink: 0;
  border-top: 1px solid #e8e8e8;
}
</style>

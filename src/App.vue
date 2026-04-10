<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import MudTerminal from '@/components/MudTerminal.vue';
import { useConfig } from '@/composables/useConfig';
import { useSocket } from '@/composables/useSocket';
import { useTelnetParser } from '@/composables/useTelnetParser';
import { GoldenLayoutAdapter } from '@/layouts/GoldenLayoutAdapter';
import {
  fullLayout,
  saveLayoutToStorage,
  loadLayoutFromStorage,
} from '@/layouts/defaultLayouts';
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

    const saved = loadLayoutFromStorage();
    adapter.loadLayout(saved || fullLayout);

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
  background: #0d0d1a;
}

#app {
  height: 100%;
  width: 100%;
}

/* ── Golden Layout theme overrides (maldorne dark) ── */
:root {
  --panel-bg: #1a1a2e;
  --panel-fg: #cccccc;
  --accent: #2d96bd;
  --border: #2a2a3e;
}

.lm_goldenlayout {
  background: #0d0d1a !important;
}

.lm_header {
  background: #16162a !important;
}

.lm_header .lm_tab {
  background: #1a1a2e !important;
  color: #888 !important;
  border: 1px solid #2a2a3e !important;
  font-family: 'Source Sans Pro', 'Segoe UI', sans-serif !important;
  font-size: 12px !important;
}

.lm_header .lm_tab.lm_active {
  background: #0d0d1a !important;
  color: #2d96bd !important;
  border-bottom-color: #0d0d1a !important;
}

.lm_header .lm_tab:hover {
  color: #ccc !important;
}

.lm_splitter {
  background: #2a2a3e !important;
}

.lm_splitter:hover {
  background: #2d96bd !important;
}

.lm_content {
  background: #0d0d1a !important;
  border: none !important;
}

.lm_controls .lm_close {
  background-color: transparent !important;
}

.lm_dragProxy .lm_content {
  background: #1a1a2e !important;
}

.lm_dropTargetIndicator {
  outline: 2px solid #2d96bd !important;
  background: rgba(45, 150, 189, 0.15) !important;
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
  background: #0d0d1a;
}

.layout-root {
  flex: 1;
  min-height: 0;
}

.error-bar {
  background: #5c1a1a;
  color: #ff6b6b;
  padding: 6px 12px;
  font-family: 'Source Sans Pro', 'Segoe UI', sans-serif;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import MudTerminal from '@/components/MudTerminal.vue';
import { useConfig } from '@/composables/useConfig';
import { useSocket } from '@/composables/useSocket';
import { useTelnetParser } from '@/composables/useTelnetParser';

const { config } = useConfig();
const socket = useSocket(config);
const parser = useTelnetParser();

const terminalRef = ref<InstanceType<typeof MudTerminal> | null>(null);

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
  if (config.debug) {
    terminalRef.value?.writeln(
      `\x1b[36m[GMCP] ${event.module}: ${JSON.stringify(event.data)}\x1b[0m`,
    );
  }
});

/* ── Data from proxy → parse → terminal ───────── */
socket.onData((raw) => {
  const clean = parser.parse(raw);
  if (clean) {
    terminalRef.value?.write(clean);
  }
});

socket.onClose(() => {
  terminalRef.value?.writeln(
    '\r\n\x1b[32mConnection closed. Refresh to reconnect.\x1b[0m',
  );
});

/* ── Command handling ─────────────────────────── */
function onCommand(raw: string) {
  // Split by separator (;) unless empty
  const separator = config.separator;
  let commands: string[];

  if (separator && raw.includes(separator)) {
    commands = raw.split(separator).map((c) => c.trim());
  } else {
    commands = [raw];
  }

  for (const cmd of commands) {
    // Echo command to terminal (unless password mode)
    if (!parser.passwordMode.value) {
      terminalRef.value?.writeln(`\x1b[33m${cmd}\x1b[0m`);
    }
    socket.send(cmd);
  }
}

/* ── Auto-connect on mount ────────────────────── */
onMounted(() => {
  terminalRef.value?.writeln('\x1b[32mConnecting to proxy...\x1b[0m');
  socket.connect();
});

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div class="app-container" @click="terminalRef?.focusInput()">
    <MudTerminal
      ref="terminalRef"
      :password-mode="parser.passwordMode.value"
      @command="onCommand"
    />
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
  background: #000;
}

#app {
  height: 100%;
  width: 100%;
}
</style>

<style scoped>
.app-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.error-bar {
  background: #5c1a1a;
  color: #ff6b6b;
  padding: 6px 12px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
}
</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const props = defineProps<{
  passwordMode: boolean;
  padded?: boolean;
}>();

const emit = defineEmits<{
  command: [cmd: string];
}>();

/* ── Refs ─────────────────────────────────────── */
const terminalRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let resizeObserver: ResizeObserver | null = null;

/* ── Command history ──────────────────────────── */
const commandHistory: string[] = [];
let historyIndex = -1;
const inputValue = ref('');

/* ── Public API ───────────────────────────────── */
function write(text: string) {
  terminal?.write(text);
}

function writeln(text: string) {
  terminal?.writeln(text);
}

function focusInput() {
  inputRef.value?.focus();
}

function refit() {
  fitAddon?.fit();
}

defineExpose({ write, writeln, focusInput, refit });

/* ── Input handling ───────────────────────────── */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      inputValue.value =
        commandHistory[commandHistory.length - 1 - historyIndex];
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      inputValue.value =
        commandHistory[commandHistory.length - 1 - historyIndex];
    } else {
      historyIndex = -1;
      inputValue.value = '';
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    submitCommand();
  }
}

function submitCommand() {
  const raw = inputValue.value;
  inputValue.value = '';
  historyIndex = -1;

  if (raw.length > 0) {
    commandHistory.push(raw);
  }

  emit('command', raw);
}

/* ── Lifecycle ────────────────────────────────── */
onMounted(async () => {
  await nextTick();
  if (!terminalRef.value) return;

  terminal = new Terminal({
    theme: {
      background: '#000000',
      foreground: '#cccccc',
      cursor: '#cccccc',
      selectionBackground: '#44475a',
      black: '#000000',
      brightBlack: '#555555',
    },
    fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
    fontSize: 14,
    lineHeight: 1.1,
    cursorBlink: false,
    cursorStyle: 'bar',
    disableStdin: true,
    convertEol: false,
    scrollback: 10000,
    allowProposedApi: true,
  });

  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon());

  terminal.open(terminalRef.value);
  fitAddon.fit();

  // Click on terminal focuses the input
  terminal.element?.addEventListener('mouseup', () => {
    // Only focus if no text is selected
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      focusInput();
    }
  });

  // Resize observer for responsive fit
  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit();
  });
  resizeObserver.observe(terminalRef.value);

  focusInput();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  terminal?.dispose();
});

/* ── Watch password mode to toggle input type ─── */
watch(
  () => props.passwordMode,
  () => {
    // Reactivity handles the :type binding
  },
);
</script>

<template>
  <div :class="['mud-terminal', { 'mud-terminal--padded': padded }]">
    <div class="terminal-wrapper">
      <div ref="terminalRef" class="terminal-container"></div>
      <div class="input-bar">
        <span class="input-prompt">&gt;</span>
        <input
          ref="inputRef"
          v-model="inputValue"
          :type="passwordMode ? 'password' : 'text'"
          class="command-input"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="Enter command..."
          @keydown="onKeydown"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mud-terminal {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #000;
}

.mud-terminal--padded {
  background: #fff;
  padding: 8px;
}

.terminal-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: 0;
  overflow: hidden;
}

.terminal-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* xterm.js padding via CSS — gives inner margin to terminal text */
.terminal-container :deep(.xterm) {
  padding: 8px;
}

.input-bar {
  display: flex;
  align-items: center;
  background: #111;
  padding: 6px 12px;
  flex-shrink: 0;
}

.input-prompt {
  color: #4ec9b0;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  margin-right: 6px;
  user-select: none;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #cccccc;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  padding: 4px 0;
  caret-color: #4ec9b0;
}

.command-input::placeholder {
  color: #555;
}
</style>

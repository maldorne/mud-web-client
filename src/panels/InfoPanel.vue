<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ComponentContainer } from 'golden-layout';

const props = defineProps<{
  glContainer: ComponentContainer;
  sharedState: Record<string, unknown>;
}>();

const messages = ref<string[]>([]);

watch(
  () => props.sharedState.gmcpLog as string[] | undefined,
  (log) => {
    if (log) messages.value = log;
  },
  { deep: true },
);
</script>

<template>
  <div class="info-panel">
    <div class="info-header">GMCP Events</div>
    <div class="info-body">
      <div v-if="messages.length === 0" class="info-empty">
        No GMCP data received yet.
      </div>
      <div v-for="(msg, idx) in messages" :key="idx" class="info-entry">
        {{ msg }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg, #1a1a2e);
  color: var(--panel-fg, #ccc);
  font-family: 'Source Sans Pro', 'Segoe UI', sans-serif;
  font-size: 13px;
}

.info-header {
  padding: 6px 10px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent, #2d96bd);
  border-bottom: 1px solid var(--border, #2a2a3e);
  flex-shrink: 0;
}

.info-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px;
}

.info-empty {
  color: #555;
  font-style: italic;
  padding: 20px 0;
  text-align: center;
}

.info-entry {
  padding: 3px 0;
  border-bottom: 1px solid var(--border, #2a2a3e);
  word-break: break-all;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12px;
}
</style>

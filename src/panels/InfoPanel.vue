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
  background: var(--panel-bg, #fff);
  color: var(--panel-fg, #363636);
  font-family: 'Source Sans Pro', sans-serif;
  font-size: 14px;
}

.info-header {
  padding: 10px 16px;
  font-weight: 400;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent, #2d96bd);
  border-bottom: 1px solid var(--border, #e8e8e8);
  flex-shrink: 0;
}

.info-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.info-empty {
  color: #767676;
  font-style: italic;
  padding: 20px 0;
  text-align: center;
}

.info-entry {
  padding: 4px 0;
  border-bottom: 1px solid var(--border, #e8e8e8);
  word-break: break-all;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12px;
  color: #363636;
}
</style>

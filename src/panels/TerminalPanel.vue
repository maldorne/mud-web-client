<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import MudTerminal from '@/components/MudTerminal.vue';
import type { ComponentContainer } from 'golden-layout';

const props = defineProps<{
  glContainer: ComponentContainer;
  sharedState: Record<string, unknown>;
}>();

const terminalRef = ref<InstanceType<typeof MudTerminal> | null>(null);

/* Expose terminal to shared state so App.vue can write to it */
onMounted(() => {
  // eslint-disable-next-line vue/no-mutating-props
  props.sharedState.terminal = terminalRef.value;

  // Re-fit terminal when golden-layout resizes this panel
  props.glContainer.on('resize', () => {
    terminalRef.value?.refit();
  });

  props.glContainer.on('show', () => {
    terminalRef.value?.refit();
  });
});

/* Forward commands up via shared state callback */
function onCommand(cmd: string) {
  const handler = props.sharedState.onCommand as
    | ((cmd: string) => void)
    | undefined;
  if (handler) handler(cmd);
}

const passwordMode = ref(false);

watch(
  () => props.sharedState.passwordMode as boolean,
  (val) => {
    passwordMode.value = !!val;
  },
);
</script>

<template>
  <MudTerminal
    ref="terminalRef"
    :password-mode="passwordMode"
    :padded="true"
    @command="onCommand"
  />
</template>

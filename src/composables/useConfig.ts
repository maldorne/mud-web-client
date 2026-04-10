import { reactive, readonly } from 'vue';
import type { ClientConfig } from '@/types';

function param(name: string): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function createConfig(): ClientConfig {
  return reactive<ClientConfig>({
    proxy: param('proxy') || 'wss://play.maldorne.org:6200/',
    host: param('host') || 'muds.maldorne.org',
    port: parseInt(param('port') || '5010', 10),
    mud: param('mud') || null,
    name: param('name') || 'Guest',
    ttype: param('ttype') || 'maldorne.org',
    debug: param('debug') === '1',
    separator: param('separator') ?? ';',
  });
}

const config = createConfig();

export function useConfig() {
  return { config: readonly(config) as ClientConfig };
}

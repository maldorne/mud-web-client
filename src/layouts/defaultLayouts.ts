import type { LayoutConfig } from 'golden-layout';

/** Embed mode: just the terminal, no tabs/headers */
export const embedLayout: LayoutConfig = {
  root: {
    type: 'component',
    componentType: 'Terminal',
    title: 'Terminal',
  },
  header: { show: false },
};

/** Full mode: terminal + side panels */
export const fullLayout: LayoutConfig = {
  root: {
    type: 'row',
    content: [
      {
        type: 'component',
        componentType: 'Terminal',
        title: 'Terminal',
        width: 75,
      },
      {
        type: 'stack',
        width: 25,
        content: [
          {
            type: 'component',
            componentType: 'Info',
            title: 'Info',
          },
        ],
      },
    ],
  },
};

const STORAGE_KEY = 'mud-web-client-layout';

export function saveLayoutToStorage(config: unknown) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage may be unavailable
  }
}

export function loadLayoutFromStorage(): LayoutConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt or unavailable
  }
  return null;
}

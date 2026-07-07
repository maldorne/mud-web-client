import { ref, type Ref } from 'vue';
import type { ConnectMessage, ClientConfig } from '@/types';

export interface UseSocketReturn {
  connected: Ref<boolean>;
  error: Ref<string | null>;
  connect: () => void;
  disconnect: () => void;
  send: (text: string) => void;
  sendBin: (bytes: number[]) => void;
  sendGmcp: (payload: string) => void;
  sendMsdp: (key: string, val: string | string[]) => void;
  onData: (fn: (data: Uint8Array) => void) => void;
  onGmcp: (fn: (raw: string) => void) => void;
  onClose: (fn: () => void) => void;
}

export function useSocket(config: ClientConfig): UseSocketReturn {
  const connected = ref(false);
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;
  const dataHandlers: ((data: Uint8Array) => void)[] = [];
  const gmcpHandlers: ((raw: string) => void)[] = [];
  const closeHandlers: (() => void)[] = [];

  /** Handle a JSON control message from the proxy (gmcp, chat, ...). */
  function handleControlMessage(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return; // not valid JSON — drop
    }
    if (typeof msg.gmcp === 'string') {
      for (const fn of gmcpHandlers) fn(msg.gmcp);
    }
    // chat / chatlog messages: ignored until the chat panel exists
  }

  function connect() {
    if (ws) return;
    error.value = null;

    ws = new WebSocket(config.proxy);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      connected.value = true;

      const msg: ConnectMessage = {
        connect: 1,
        utf8: 1,
        mccp: 0,
        debug: config.debug ? 1 : 0,
        ttype: config.ttype,
        name: config.name,
        mxp: 1,
      };

      if (config.mud) {
        msg.mud = config.mud;
      } else {
        msg.host = config.host;
        msg.port = config.port;
      }

      ws!.send(JSON.stringify(msg));
    };

    ws.onmessage = (event: MessageEvent) => {
      let raw: string | ArrayBuffer;
      if (event.data instanceof ArrayBuffer) {
        raw = event.data;
      } else {
        raw = String(event.data);
      }

      // The proxy sends JSON control messages (gmcp, chat, ...) as text
      // frames starting with '{'; MUD data always arrives as binary frames.
      if (typeof raw === 'string') {
        if (raw.startsWith('{')) {
          handleControlMessage(raw);
          return;
        }
        const encoder = new TextEncoder();
        for (const fn of dataHandlers) fn(encoder.encode(raw));
        return;
      }

      for (const fn of dataHandlers) fn(new Uint8Array(raw));
    };

    ws.onclose = () => {
      connected.value = false;
      ws = null;
      for (const fn of closeHandlers) fn();
    };

    ws.onerror = () => {
      error.value = 'Connection error — proxy may be down.';
    };
  }

  function disconnect() {
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
      connected.value = false;
    }
  }

  function send(text: string) {
    if (ws && connected.value) {
      ws.send(text + '\r\n');
    }
  }

  function sendBin(bytes: number[]) {
    if (ws && connected.value) {
      ws.send(JSON.stringify({ bin: bytes }));
    }
  }

  function sendGmcp(payload: string) {
    if (ws && connected.value) {
      ws.send(JSON.stringify({ gmcp: payload }));
    }
  }

  function sendMsdp(key: string, val: string | string[]) {
    if (ws && connected.value) {
      ws.send(JSON.stringify({ msdp: { key, val } }));
    }
  }

  function onData(fn: (data: Uint8Array) => void) {
    dataHandlers.push(fn);
  }

  function onGmcp(fn: (raw: string) => void) {
    gmcpHandlers.push(fn);
  }

  function onClose(fn: () => void) {
    closeHandlers.push(fn);
  }

  return {
    connected,
    error,
    connect,
    disconnect,
    send,
    sendBin,
    sendGmcp,
    sendMsdp,
    onData,
    onGmcp,
    onClose,
  };
}

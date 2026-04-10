import { ref } from 'vue';
import { TEL } from '@/types';
import type { GmcpEvent, MsdpPair } from '@/types';

/**
 * Parses incoming text from the proxy, extracting embedded IAC sequences
 * (GMCP, MSDP, MXP, ECHO) and returning clean text for the terminal.
 *
 * The proxy forwards raw telnet data as text — IAC bytes appear as
 * high-codepoint characters in the string. We scan for them here.
 */
export function useTelnetParser() {
  const passwordMode = ref(false);
  const gmcpEvents: ((event: GmcpEvent) => void)[] = [];
  const msdpEvents: ((pairs: MsdpPair[]) => void)[] = [];
  const bellEvents: (() => void)[] = [];
  /* Buffer for incomplete IAC subnegotiations split across messages */
  let pendingBuffer = '';

  function onGmcp(fn: (event: GmcpEvent) => void) {
    gmcpEvents.push(fn);
  }
  function onMsdp(fn: (pairs: MsdpPair[]) => void) {
    msdpEvents.push(fn);
  }
  function onBell(fn: () => void) {
    bellEvents.push(fn);
  }

  function emitGmcp(raw: string) {
    const spaceIdx = raw.indexOf(' ');
    const module = spaceIdx === -1 ? raw : raw.substring(0, spaceIdx);
    let data: unknown = undefined;
    if (spaceIdx !== -1) {
      try {
        data = JSON.parse(raw.substring(spaceIdx + 1));
      } catch {
        data = raw.substring(spaceIdx + 1);
      }
    }
    for (const fn of gmcpEvents) fn({ module, data });
  }

  function emitMsdp(raw: string) {
    const pairs: MsdpPair[] = [];
    const parts = raw.split(String.fromCharCode(TEL.MSDP_VAR));
    for (const part of parts) {
      if (!part) continue;
      const valIdx = part.indexOf(String.fromCharCode(TEL.MSDP_VAL));
      if (valIdx === -1) continue;
      pairs.push({
        key: part.substring(0, valIdx),
        value: part.substring(valIdx + 1),
      });
    }
    if (pairs.length) {
      for (const fn of msdpEvents) fn(pairs);
    }
  }

  /**
   * Parse incoming text, extract protocol data, return clean terminal text.
   * Handles split subnegotiations across multiple messages.
   */
  function parse(input: string): string {
    let text = pendingBuffer + input;
    pendingBuffer = '';

    // Check for incomplete IAC subnegotiation at the end
    const iacSb = String.fromCharCode(TEL.IAC, TEL.SB);
    const iacSe = String.fromCharCode(TEL.IAC, TEL.SE);
    const lastSb = text.lastIndexOf(iacSb);
    if (lastSb !== -1) {
      const seAfter = text.indexOf(iacSe, lastSb);
      if (seAfter === -1) {
        // Incomplete subnegotiation — buffer it and wait
        pendingBuffer = text.substring(lastSb);
        text = text.substring(0, lastSb);
      }
    }

    // IAC WILL ECHO → password mode on
    const willEcho = String.fromCharCode(TEL.IAC, TEL.WILL, TEL.ECHO);
    if (text.includes(willEcho)) {
      passwordMode.value = true;
      text = text.replaceAll(willEcho, '');
    }

    // IAC WONT ECHO → password mode off
    const wontEcho = String.fromCharCode(TEL.IAC, TEL.WONT, TEL.ECHO);
    if (text.includes(wontEcho)) {
      passwordMode.value = false;
      text = text.replaceAll(wontEcho, '');
    }

    // GMCP subnegotiations: IAC SB GMCP ... IAC SE
    const gmcpSb = String.fromCharCode(TEL.IAC, TEL.SB, TEL.GMCP);
    text = extractSubneg(text, gmcpSb, iacSe, (data) => emitGmcp(data));

    // MSDP subnegotiations: IAC SB MSDP ... IAC SE
    const msdpSb = String.fromCharCode(TEL.IAC, TEL.SB, TEL.MSDP);
    text = extractSubneg(text, msdpSb, iacSe, (data) => emitMsdp(data));

    // ATCP subnegotiations: IAC SB ATCP ... IAC SE
    const atcpSb = String.fromCharCode(TEL.IAC, TEL.SB, TEL.ATCP);
    text = extractSubneg(text, atcpSb, iacSe, (data) => emitGmcp(data));

    // IAC WILL GMCP / IAC WILL MSDP — strip negotiation markers
    const willGmcp = String.fromCharCode(TEL.IAC, TEL.WILL, TEL.GMCP);
    const willMsdp = String.fromCharCode(TEL.IAC, TEL.WILL, TEL.MSDP);
    const willMxp = String.fromCharCode(TEL.IAC, TEL.WILL, TEL.MXP);
    text = text.replaceAll(willGmcp, '');
    text = text.replaceAll(willMsdp, '');
    text = text.replaceAll(willMxp, '');

    // Strip any remaining IAC sequences (DO/DONT/WILL/WONT + option byte)
    text = text.replace(/[\xff]([\xfb\xfc\xfd\xfe]).?/g, '');

    // Strip any remaining subnegotiations we don't handle
    text = text.replace(/[\xff][\xfa][\s\S]*?[\xff][\xf0]/g, '');

    // Bell character
    if (text.includes('\x07')) {
      for (const fn of bellEvents) fn();
      text = text.replaceAll('\x07', '');
    }

    // Normalize line endings
    text = text.replace(/\r\n/g, '\r\n');
    text = text.replace(/\n(?!\r)/g, '\r\n');

    return text;
  }

  /** Extract all subnegotiation blocks matching prefix/suffix and call handler */
  function extractSubneg(
    text: string,
    prefix: string,
    suffix: string,
    handler: (data: string) => void,
  ): string {
    let idx = text.indexOf(prefix);
    while (idx !== -1) {
      const end = text.indexOf(suffix, idx + prefix.length);
      if (end === -1) break;
      const data = text.substring(idx + prefix.length, end);
      handler(data);
      text = text.substring(0, idx) + text.substring(end + suffix.length);
      idx = text.indexOf(prefix);
    }
    return text;
  }

  function flush(): string {
    if (!pendingBuffer) return '';
    const buf = pendingBuffer;
    pendingBuffer = '';
    return parse(buf);
  }

  return {
    passwordMode,
    parse,
    flush,
    onGmcp,
    onMsdp,
    onBell,
  };
}

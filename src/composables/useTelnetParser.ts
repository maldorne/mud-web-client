import { ref } from 'vue';
import { TEL } from '@/types';
import type { GmcpEvent, MsdpPair } from '@/types';

/**
 * Parses incoming raw bytes from the proxy, extracting IAC sequences
 * (GMCP, MSDP, ECHO) at the byte level, then decodes the remaining
 * bytes as UTF-8 for the terminal.
 *
 * This two-phase approach (bytes → strip IAC → decode UTF-8) prevents
 * IAC bytes (0xFF etc.) from being mangled by TextDecoder.
 */
export function useTelnetParser() {
  const passwordMode = ref(false);
  const gmcpHandlers: ((event: GmcpEvent) => void)[] = [];
  const msdpHandlers: ((pairs: MsdpPair[]) => void)[] = [];
  const bellHandlers: (() => void)[] = [];
  const decoder = new TextDecoder('utf-8', { fatal: false });

  /** Buffer for incomplete IAC subnegotiations split across messages */
  let pending: Uint8Array | null = null;

  function onGmcp(fn: (event: GmcpEvent) => void) {
    gmcpHandlers.push(fn);
  }
  function onMsdp(fn: (pairs: MsdpPair[]) => void) {
    msdpHandlers.push(fn);
  }
  function onBell(fn: () => void) {
    bellHandlers.push(fn);
  }

  function emitGmcp(data: Uint8Array) {
    const raw = decoder.decode(data);
    const spaceIdx = raw.indexOf(' ');
    const module = spaceIdx === -1 ? raw : raw.substring(0, spaceIdx);
    let parsed: unknown = undefined;
    if (spaceIdx !== -1) {
      try {
        parsed = JSON.parse(raw.substring(spaceIdx + 1));
      } catch {
        parsed = raw.substring(spaceIdx + 1);
      }
    }
    for (const fn of gmcpHandlers) fn({ module, data: parsed });
  }

  function emitMsdp(data: Uint8Array) {
    const pairs: MsdpPair[] = [];
    let keyStart = -1;
    let valStart = -1;
    let currentKey = '';

    for (let i = 0; i < data.length; i++) {
      if (data[i] === TEL.MSDP_VAR) {
        // Save previous pair if exists
        if (valStart !== -1) {
          pairs.push({
            key: currentKey,
            value: decoder.decode(data.slice(valStart, i)),
          });
        }
        keyStart = i + 1;
        valStart = -1;
      } else if (data[i] === TEL.MSDP_VAL && keyStart !== -1) {
        currentKey = decoder.decode(data.slice(keyStart, i));
        valStart = i + 1;
      }
    }
    // Last pair
    if (valStart !== -1) {
      pairs.push({
        key: currentKey,
        value: decoder.decode(data.slice(valStart)),
      });
    }

    if (pairs.length) {
      for (const fn of msdpHandlers) fn(pairs);
    }
  }

  /**
   * Parse raw bytes: extract IAC sequences, return clean UTF-8 text.
   */
  function parse(input: Uint8Array): string {
    // Prepend any pending bytes from a previous incomplete message
    let bytes: Uint8Array;
    if (pending) {
      bytes = concat(pending, input);
      pending = null;
    } else {
      bytes = input;
    }

    // Check for incomplete IAC subnegotiation at the end:
    // find last IAC SB that doesn't have a matching IAC SE after it
    const lastSb = findLastIacSb(bytes);
    if (lastSb !== -1 && !hasIacSeAfter(bytes, lastSb)) {
      pending = bytes.slice(lastSb);
      bytes = bytes.slice(0, lastSb);
    }

    // Process IAC sequences and build clean output
    const clean = stripIac(bytes);

    // Handle bell characters
    let hasBell = false;
    const filtered: number[] = [];
    for (let i = 0; i < clean.length; i++) {
      if (clean[i] === 0x07) {
        hasBell = true;
      } else {
        filtered.push(clean[i]);
      }
    }
    if (hasBell) {
      for (const fn of bellHandlers) fn();
    }

    // Decode remaining bytes as UTF-8
    let text = decoder.decode(new Uint8Array(filtered));

    // Normalize line endings for xterm.js
    text = text.replace(/\r\n/g, '\r\n');
    text = text.replace(/(?<!\r)\n/g, '\r\n');

    return text;
  }

  /**
   * Scan bytes, process IAC sequences, return non-IAC bytes.
   */
  function stripIac(bytes: Uint8Array): Uint8Array {
    const out: number[] = [];
    let i = 0;

    while (i < bytes.length) {
      if (bytes[i] !== TEL.IAC) {
        out.push(bytes[i]);
        i++;
        continue;
      }

      // IAC at end of buffer — keep it (shouldn't happen after pending check)
      if (i + 1 >= bytes.length) {
        out.push(bytes[i]);
        i++;
        continue;
      }

      const verb = bytes[i + 1];

      // IAC SB ... IAC SE (subnegotiation)
      if (verb === TEL.SB) {
        const seIdx = findIacSe(bytes, i + 2);
        if (seIdx === -1) {
          // Incomplete — skip rest (shouldn't happen after pending check)
          break;
        }
        const option = bytes[i + 2];
        const data = bytes.slice(i + 3, seIdx);
        handleSubnegotiation(option, data);
        i = seIdx + 2; // skip past IAC SE
        continue;
      }

      // IAC WILL/WONT/DO/DONT + option byte
      if (
        verb === TEL.WILL ||
        verb === TEL.WONT ||
        verb === TEL.DO ||
        verb === TEL.DONT
      ) {
        if (i + 2 < bytes.length) {
          const option = bytes[i + 2];
          handleNegotiation(verb, option);
          i += 3;
        } else {
          i += 2;
        }
        continue;
      }

      // IAC IAC = escaped 0xFF literal
      if (verb === TEL.IAC) {
        out.push(0xff);
        i += 2;
        continue;
      }

      // Other IAC command (GA, NOP, etc.) — skip 2 bytes
      i += 2;
    }

    return new Uint8Array(out);
  }

  function handleNegotiation(verb: number, option: number) {
    if (option === TEL.ECHO) {
      if (verb === TEL.WILL) {
        passwordMode.value = true;
      } else if (verb === TEL.WONT) {
        passwordMode.value = false;
      }
    }
    // Other WILL/WONT/DO/DONT — silently ignore
  }

  function handleSubnegotiation(option: number, data: Uint8Array) {
    switch (option) {
      case TEL.GMCP:
        emitGmcp(data);
        break;
      case TEL.ATCP:
        emitGmcp(data);
        break;
      case TEL.MSDP:
        emitMsdp(data);
        break;
      // Other subnegotiations — ignore
    }
  }

  /** Find IAC SE (0xFF 0xF0) starting from offset */
  function findIacSe(bytes: Uint8Array, from: number): number {
    for (let i = from; i < bytes.length - 1; i++) {
      if (bytes[i] === TEL.IAC && bytes[i + 1] === TEL.SE) {
        return i;
      }
    }
    return -1;
  }

  /** Find last IAC SB in the buffer */
  function findLastIacSb(bytes: Uint8Array): number {
    for (let i = bytes.length - 2; i >= 0; i--) {
      if (bytes[i] === TEL.IAC && bytes[i + 1] === TEL.SB) {
        return i;
      }
    }
    return -1;
  }

  /** Check if there's an IAC SE after the given position */
  function hasIacSeAfter(bytes: Uint8Array, from: number): boolean {
    return findIacSe(bytes, from + 2) !== -1;
  }

  /** Concatenate two Uint8Arrays */
  function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }

  function flush(): string {
    if (!pending) return '';
    const buf = pending;
    pending = null;
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

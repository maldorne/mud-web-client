import { expect } from 'chai';
import { useTelnetParser } from '../src/composables/useTelnetParser';
import { TEL } from '../src/types';

const GA = 249; // telnet Go Ahead, sent by LPmuds after prompts

function bytes(...parts: (string | number[])[]): Uint8Array {
  const chunks = parts.map((p) =>
    typeof p === 'string' ? new TextEncoder().encode(p) : new Uint8Array(p),
  );
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

describe('useTelnetParser', () => {
  it('passes plain text through', () => {
    const parser = useTelnetParser();
    expect(parser.parse(bytes('Hello'))).to.equal('Hello');
  });

  it('strips IAC GA arriving complete at the end of a message', () => {
    const parser = useTelnetParser();
    expect(parser.parse(bytes('> ', [TEL.IAC, GA]))).to.equal('> ');
  });

  it('does not leak a lone trailing IAC when GA arrives in the next message', () => {
    const parser = useTelnetParser();
    expect(parser.parse(bytes('> ', [TEL.IAC]))).to.equal('> ');
    expect(parser.parse(bytes([GA], 'next'))).to.equal('next');
  });

  it('completes an IAC WILL split before its option byte', () => {
    const parser = useTelnetParser();
    expect(parser.parse(bytes([TEL.IAC, TEL.WILL]))).to.equal('');
    expect(parser.parse(bytes([TEL.ECHO]))).to.equal('');
    expect(parser.passwordMode.value).to.equal(true);
  });

  it('buffers a GMCP subnegotiation split across messages', () => {
    const parser = useTelnetParser();
    const events: string[] = [];
    parser.onGmcp((e) => events.push(e.module));

    const payload = 'Char.Vitals {"hp":10}';
    const full = bytes([TEL.IAC, TEL.SB, TEL.GMCP], payload);

    expect(parser.parse(full.slice(0, 10))).to.equal('');
    expect(
      parser.parse(bytes([...full.slice(10)], [TEL.IAC, TEL.SE], 'after')),
    ).to.equal('after');
    expect(events).to.deep.equal(['Char.Vitals']);
  });

  it('unescapes IAC IAC to a literal 0xff byte', () => {
    const parser = useTelnetParser();
    // 0xff alone is invalid UTF-8, so it decodes to U+FFFD — the point is
    // that exactly one replacement char is produced, not two, and the
    // surrounding text survives.
    expect(parser.parse(bytes('a', [TEL.IAC, TEL.IAC], 'b'))).to.equal('a�b');
  });

  it('sets password mode on IAC WILL ECHO and clears it on IAC WONT ECHO', () => {
    const parser = useTelnetParser();
    parser.parse(bytes([TEL.IAC, TEL.WILL, TEL.ECHO]));
    expect(parser.passwordMode.value).to.equal(true);
    parser.parse(bytes([TEL.IAC, TEL.WONT, TEL.ECHO]));
    expect(parser.passwordMode.value).to.equal(false);
  });
});

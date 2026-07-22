import { describe, expect, it, vi } from 'vitest';
import { createPinnedTransport, type RuntimeConnection } from './runtimeTransport';

function connection(response: string): RuntimeConnection & { written: () => string } {
  let unread = new TextEncoder().encode(response);
  const writes: Uint8Array[] = [];
  return {
    async read(buffer) {
      if (!unread.length) return null;
      const count = Math.min(buffer.length, unread.length, 7);
      buffer.set(unread.slice(0, count));
      unread = unread.slice(count);
      return count;
    },
    async write(data) { writes.push(data.slice()); return data.length; },
    close: vi.fn(),
    written: () => new TextDecoder().decode(Uint8Array.from(writes.flatMap((chunk) => [...chunk]))),
  };
}

describe('createPinnedTransport', () => {
  it('connects to the approved IP and uses the original hostname for TLS SNI and certificate validation', async () => {
    const raw = connection('');
    const tls = connection('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 2\r\n\r\nok');
    const connect = vi.fn(async () => raw);
    const startTls = vi.fn(async () => tls);
    const transport = createPinnedTransport(connect, startTls);
    const url = new URL('https://recipes.example/path?q=one');

    const response = await transport({ url, approvedAddresses: ['93.184.216.34'], signal: new AbortController().signal, headers: { accept: 'text/html' }, maxBytes: 100 });

    expect(connect).toHaveBeenCalledWith({ hostname: '93.184.216.34', port: 443, signal: expect.any(AbortSignal) });
    expect(startTls).toHaveBeenCalledWith(raw, { hostname: 'recipes.example' });
    expect(tls.written()).toContain('GET /path?q=one HTTP/1.1\r\nHost: recipes.example\r\n');
    expect(tls.written()).toContain('Accept-Encoding: identity\r\nConnection: close\r\n');
    expect(await response.text()).toBe('ok');
  });

  it('decodes chunked framing and caps the decoded body while reading', async () => {
    const good = connection('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n2\r\nde\r\n0\r\n\r\n');
    const makeTransport = (conn: RuntimeConnection) => createPinnedTransport(async () => conn, async (value) => value);
    const request = { url: new URL('http://example.com'), approvedAddresses: ['93.184.216.34'], signal: new AbortController().signal, headers: {}, maxBytes: 5 };
    expect(await (await makeTransport(good)(request)).text()).toBe('abcde');

    const tooLarge = connection('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nTransfer-Encoding: chunked\r\n\r\n6\r\nabcdef\r\n0\r\n\r\n');
    await expect(makeTransport(tooLarge)(request)).rejects.toThrow('too large');
  });

  it('applies the abort signal during the TLS handshake', async () => {
    const raw = connection('');
    const controller = new AbortController();
    const transport = createPinnedTransport(async () => raw, async () => {
      controller.abort(new Error('timed out'));
      return connection('');
    });
    await expect(transport({ url: new URL('https://example.com'), approvedAddresses: ['93.184.216.34'], signal: controller.signal, headers: {}, maxBytes: 10 })).rejects.toThrow('timed out');
    expect(raw.close).toHaveBeenCalled();
  });
});

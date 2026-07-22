import { describe, expect, it, vi } from 'vitest';
import { ImportError, assertSafeUrl, fetchRecipePage, type PinnedTransport } from './security';

describe('recipe URL security', () => {
  it.each(['ftp://example.com/a', 'https://user:pass@example.com/a', 'http://localhost/a', 'http://127.0.0.1/a', 'http://169.254.1.2/a', 'http://10.1.2.3/a', 'http://[::1]/a', 'http://[2001:db8::1]/a', 'http://[::ffff:7f00:1]/a', 'http://[64:ff9b::7f00:1]/a'])('rejects unsafe URL %s', async (value) => {
    await expect(assertSafeUrl(value, vi.fn())).rejects.toBeInstanceOf(ImportError);
  });

  it('rejects hostnames resolving to private addresses', async () => {
    await expect(assertSafeUrl('https://recipes.example/a', async () => ['192.168.1.3'])).rejects.toMatchObject({ code: 'BLOCKED_URL' });
  });

  it.each(['::ffff:7f00:1', '::ffff:c0a8:101', '64:ff9b::7f00:1'])('rejects encoded private DNS result %s', async (address) => {
    await expect(assertSafeUrl('https://recipes.example/a', async () => [address])).rejects.toMatchObject({ code: 'BLOCKED_URL' });
  });

  it('applies the request deadline while DNS is unresolved', async () => {
    const never = () => new Promise<string[]>(() => undefined);
    const transport: PinnedTransport = async () => new Response('unused');
    await expect(fetchRecipePage('https://recipes.example/a', { resolveHost: never, transport, timeoutMs: 10 })).rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });

  it('revalidates redirect targets', async () => {
    const transport = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } }));
    await expect(fetchRecipePage('https://example.com/a', { transport, resolveHost: async () => ['93.184.216.34'] })).rejects.toMatchObject({ code: 'BLOCKED_URL' });
  });

  it('pins the transport to the exact approved DNS results', async () => {
    const transport: PinnedTransport = vi.fn(async () => new Response('<p>ok</p>', { headers: { 'content-type': 'text/html' } }));
    await fetchRecipePage('https://recipes.example/a', { transport, resolveHost: async () => ['93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946'] });
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({
      url: new URL('https://recipes.example/a'),
      approvedAddresses: ['93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946'],
      maxBytes: 1_500_000,
      headers: expect.objectContaining({
        accept: 'text/html,application/xhtml+xml',
        'user-agent': expect.stringContaining('Mozilla/5.0'),
      }),
    }));
  });

  it('rejects non-html and oversized responses', async () => {
    const resolveHost = async () => ['93.184.216.34'];
    await expect(fetchRecipePage('https://example.com/a', { resolveHost, transport: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }) })).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT' });
    await expect(fetchRecipePage('https://example.com/a', { resolveHost, maxBytes: 4, transport: async () => new Response('12345', { headers: { 'content-type': 'text/html' } }) })).rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });
});

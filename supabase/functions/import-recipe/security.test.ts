import { describe, expect, it, vi } from 'vitest';
import { ImportError, assertSafeUrl, fetchRecipePage } from './security';

describe('recipe URL security', () => {
  it.each(['ftp://example.com/a', 'https://user:pass@example.com/a', 'http://localhost/a', 'http://127.0.0.1/a', 'http://169.254.1.2/a', 'http://10.1.2.3/a', 'http://[::1]/a', 'http://[2001:db8::1]/a'])('rejects unsafe URL %s', async (value) => {
    await expect(assertSafeUrl(value, vi.fn())).rejects.toBeInstanceOf(ImportError);
  });

  it('rejects hostnames resolving to private addresses', async () => {
    await expect(assertSafeUrl('https://recipes.example/a', async () => ['192.168.1.3'])).rejects.toMatchObject({ code: 'BLOCKED_URL' });
  });

  it('revalidates redirect targets', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } }));
    await expect(fetchRecipePage('https://example.com/a', { fetcher, resolveHost: async () => ['93.184.216.34'] })).rejects.toMatchObject({ code: 'BLOCKED_URL' });
  });

  it('rejects non-html and oversized responses', async () => {
    const resolveHost = async () => ['93.184.216.34'];
    await expect(fetchRecipePage('https://example.com/a', { resolveHost, fetcher: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }) })).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT' });
    await expect(fetchRecipePage('https://example.com/a', { resolveHost, maxBytes: 4, fetcher: async () => new Response('12345', { headers: { 'content-type': 'text/html' } }) })).rejects.toMatchObject({ code: 'FETCH_FAILED' });
  });
});

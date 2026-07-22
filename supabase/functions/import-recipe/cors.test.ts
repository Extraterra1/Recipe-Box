import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { withCors } from './cors';

describe('withCors', () => {
  it('lets preflight reach the function while application auth protects POST', () => {
    const config = readFileSync('supabase/config.toml', 'utf8');
    expect(config).toContain('[functions.import-recipe]');
    expect(config).toContain('verify_jwt = false');
  });
  it('answers unauthenticated preflight without invoking the protected handler', async () => {
    let called = false;
    const handler = withCors(async () => { called = true; return new Response(null, { status: 401 }); });
    const response = await handler(new Request('https://function.test', { method: 'OPTIONS' }));
    expect(response.status).toBe(204);
    expect(called).toBe(false);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-headers')).toContain('authorization');
  });

  it('adds CORS headers to success, auth failure, and thrown-error responses', async () => {
    for (const handler of [
      withCors(async () => Response.json({ ok: true })),
      withCors(async () => Response.json({ error: 'unauthorized' }, { status: 401 })),
      withCors(async () => { throw new Error('boom'); }),
    ]) {
      const response = await handler(new Request('https://function.test', { method: 'POST' }));
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    }
  });
});

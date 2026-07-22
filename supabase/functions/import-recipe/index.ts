import { withSupabase } from 'npm:@supabase/server@^1';
import { withCors } from './cors.ts';
import { createPinnedTransport } from './runtimeTransport.ts';
import { importRecipe } from './service.ts';
import { ImportError } from './security.ts';

async function resolveHost(hostname: string, signal?: AbortSignal): Promise<string[]> {
  const addresses = await Promise.allSettled([
    Deno.resolveDns(hostname, 'A', { signal }),
    Deno.resolveDns(hostname, 'AAAA', { signal }),
  ]);
  return addresses.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

export default {
  fetch: withCors(withSupabase({ auth: 'user' }, async (request) => {
    if (request.method !== 'POST') return Response.json({ error: { code: 'INVALID_URL', message: 'Use POST to import a recipe.' } }, { status: 405 });
    try {
      let body: unknown;
      try { body = await request.json(); }
      catch { throw new ImportError('INVALID_URL', 'Send a JSON body containing a recipe URL.'); }
      const transport = createPinnedTransport(
        Deno.connect,
        (connection, options) => Deno.startTls(connection as Deno.TcpConn, options),
      );
      const recipe = await importRecipe(body, { resolveHost, transport });
      return Response.json({ recipe });
    } catch (error) {
      const known = error instanceof ImportError ? error : new ImportError('PARSE_FAILED', 'The recipe could not be imported.', 500);
      return Response.json({ error: { code: known.code, message: known.message } }, { status: known.status });
    }
  })),
};

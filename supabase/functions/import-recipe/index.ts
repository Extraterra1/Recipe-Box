import { withSupabase } from 'npm:@supabase/server@^1';
import { importRecipe } from './service.ts';
import { ImportError } from './security.ts';

async function resolveHost(hostname: string): Promise<string[]> {
  const addresses = await Promise.allSettled([
    Deno.resolveDns(hostname, 'A'),
    Deno.resolveDns(hostname, 'AAAA'),
  ]);
  return addresses.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request) => {
    if (request.method !== 'POST') return Response.json({ error: { code: 'INVALID_URL', message: 'Use POST to import a recipe.' } }, { status: 405 });
    try {
      let body: unknown;
      try { body = await request.json(); }
      catch { throw new ImportError('INVALID_URL', 'Send a JSON body containing a recipe URL.'); }
      const recipe = await importRecipe(body, { resolveHost });
      return Response.json({ recipe });
    } catch (error) {
      const known = error instanceof ImportError ? error : new ImportError('PARSE_FAILED', 'The recipe could not be imported.', 500);
      return Response.json({ error: { code: known.code, message: known.message } }, { status: known.status });
    }
  }),
};

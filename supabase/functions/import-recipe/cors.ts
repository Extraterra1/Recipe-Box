export const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
} as const;

type Handler = (request: Request) => Promise<Response>;

function addCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function withCors(handler: Handler): Handler {
  return async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    try { return addCors(await handler(request)); }
    catch { return addCors(Response.json({ error: { code: 'PARSE_FAILED', message: 'The recipe could not be imported.' } }, { status: 500 })); }
  };
}

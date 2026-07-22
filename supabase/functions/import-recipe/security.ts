export type ImportErrorCode = 'INVALID_URL' | 'BLOCKED_URL' | 'FETCH_FAILED' | 'UNSUPPORTED_CONTENT' | 'RECIPE_NOT_FOUND' | 'PARSE_FAILED';

export class ImportError extends Error {
  constructor(public readonly code: ImportErrorCode, message: string, public readonly status = 400) { super(message); }
}

export type ResolveHost = (hostname: string) => Promise<string[]>;
export type PinnedTransport = (request: { url: URL; approvedAddresses: string[]; signal: AbortSignal; headers: Record<string, string>; maxBytes: number }) => Promise<Response>;

function blockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || a >= 224;
}

function blockedIp(ip: string): boolean {
  const normalized = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (blockedIpv4(normalized)) return true;
  if (!normalized.includes(':')) return false;
  if (
    normalized === '::' || normalized === '::1' ||
    normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff') ||
    normalized.startsWith('100:') || normalized.startsWith('2001:db8:') || normalized.startsWith('2001:2:') ||
    normalized.startsWith('2001:10:') || normalized.startsWith('2002:') || normalized.startsWith('3fff:') ||
    normalized.startsWith('5f00:') || normalized.startsWith('64:ff9b:1:')
  ) return true;
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? blockedIpv4(mapped) : false;
}

export async function assertSafeUrl(value: string, resolveHost: ResolveHost): Promise<{ url: URL; approvedAddresses: string[] }> {
  let url: URL;
  try { url = new URL(value); } catch { throw new ImportError('INVALID_URL', 'Enter a valid recipe URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new ImportError('INVALID_URL', 'Only public HTTP and HTTPS URLs are supported.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || blockedIp(hostname)) throw new ImportError('BLOCKED_URL', 'That address cannot be imported.');
  let addresses: string[];
  try { addresses = await resolveHost(hostname); } catch { throw new ImportError('FETCH_FAILED', 'The recipe site could not be reached.', 502); }
  if (!addresses.length || addresses.some(blockedIp)) throw new ImportError('BLOCKED_URL', 'That address cannot be imported.');
  return { url, approvedAddresses: addresses };
}

type FetchOptions = { transport: PinnedTransport; resolveHost: ResolveHost; maxRedirects?: number; maxBytes?: number; timeoutMs?: number };

export async function fetchRecipePage(value: string, options: FetchOptions): Promise<{ html: string; finalUrl: string }> {
  const maxRedirects = options.maxRedirects ?? 4;
  const maxBytes = options.maxBytes ?? 1_500_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    let target = await assertSafeUrl(value, options.resolveHost);
    for (let redirects = 0; ; redirects++) {
      let response: Response;
      try { response = await options.transport({ url: target.url, approvedAddresses: target.approvedAddresses, signal: controller.signal, headers: { accept: 'text/html,application/xhtml+xml' }, maxBytes }); }
      catch { throw new ImportError('FETCH_FAILED', 'The recipe site could not be reached.', 502); }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= maxRedirects) throw new ImportError('FETCH_FAILED', 'The recipe page redirected too many times.', 502);
        const location = response.headers.get('location');
        if (!location) throw new ImportError('FETCH_FAILED', 'The recipe site returned an invalid redirect.', 502);
        target = await assertSafeUrl(new URL(location, target.url).href, options.resolveHost);
        continue;
      }
      if (!response.ok) throw new ImportError('FETCH_FAILED', 'The recipe page could not be downloaded.', 502);
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new ImportError('UNSUPPORTED_CONTENT', 'The URL does not point to an HTML page.', 415);
      const declaredSize = Number(response.headers.get('content-length') || 0);
      if (declaredSize > maxBytes) throw new ImportError('FETCH_FAILED', 'The recipe page is too large.', 413);
      const reader = response.body?.getReader();
      if (!reader) return { html: '', finalUrl: target.url.href };
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        size += chunk.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new ImportError('FETCH_FAILED', 'The recipe page is too large.', 413); }
        chunks.push(chunk);
      }
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      return { html: new TextDecoder().decode(body), finalUrl: target.url.href };
    }
  } finally { clearTimeout(timer); }
}

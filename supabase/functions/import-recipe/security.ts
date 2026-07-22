export type ImportErrorCode = 'INVALID_URL' | 'BLOCKED_URL' | 'FETCH_FAILED' | 'UNSUPPORTED_CONTENT' | 'RECIPE_NOT_FOUND' | 'PARSE_FAILED';

export class ImportError extends Error {
  constructor(public readonly code: ImportErrorCode, message: string, public readonly status = 400) { super(message); }
}

export type ResolveHost = (hostname: string, signal?: AbortSignal) => Promise<string[]>;
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
  const words = ipv6Words(normalized);
  if (!words) return false;
  const embedded = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
  const mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  const nat64 = words[0] === 0x64 && words[1] === 0xff9b && words.slice(2, 6).every((word) => word === 0);
  return (mapped || nat64) && blockedIpv4(embedded);
}

function ipv6Words(value: string): number[] | undefined {
  let input = value;
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(input)?.[1];
  if (dotted) {
    const bytes = dotted.split('.').map(Number);
    if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return undefined;
    input = input.slice(0, -dotted.length) + `${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const halves = input.split('::');
  if (halves.length > 2) return undefined;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return undefined;
  const parts = [...left, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...right];
  const words = parts.map((part) => Number.parseInt(part, 16));
  return words.length === 8 && words.every((word, index) => /^[0-9a-f]{1,4}$/i.test(parts[index]) && word <= 0xffff) ? words : undefined;
}

async function resolveBeforeAbort(resolveHost: ResolveHost, hostname: string, signal?: AbortSignal): Promise<string[]> {
  if (!signal) return resolveHost(hostname);
  if (signal.aborted) throw signal.reason;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    resolveHost(hostname, signal).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export async function assertSafeUrl(value: string, resolveHost: ResolveHost, signal?: AbortSignal): Promise<{ url: URL; approvedAddresses: string[] }> {
  let url: URL;
  try { url = new URL(value); } catch { throw new ImportError('INVALID_URL', 'Enter a valid recipe URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new ImportError('INVALID_URL', 'Only public HTTP and HTTPS URLs are supported.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || blockedIp(hostname)) throw new ImportError('BLOCKED_URL', 'That address cannot be imported.');
  let addresses: string[];
  try { addresses = await resolveBeforeAbort(resolveHost, hostname, signal); } catch { throw new ImportError('FETCH_FAILED', 'The recipe site could not be reached.', 502); }
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
    let target = await assertSafeUrl(value, options.resolveHost, controller.signal);
    for (let redirects = 0; ; redirects++) {
      let response: Response;
      try {
        response = await options.transport({
          url: target.url,
          approvedAddresses: target.approvedAddresses,
          signal: controller.signal,
          headers: {
            accept: 'text/html,application/xhtml+xml',
            'user-agent': 'Mozilla/5.0 (compatible; RecipeBox/1.0; +https://recipe-box-puce-nu.vercel.app)',
          },
          maxBytes,
        });
      }
      catch { throw new ImportError('FETCH_FAILED', 'The recipe site could not be reached.', 502); }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= maxRedirects) throw new ImportError('FETCH_FAILED', 'The recipe page redirected too many times.', 502);
        const location = response.headers.get('location');
        if (!location) throw new ImportError('FETCH_FAILED', 'The recipe site returned an invalid redirect.', 502);
        target = await assertSafeUrl(new URL(location, target.url).href, options.resolveHost, controller.signal);
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

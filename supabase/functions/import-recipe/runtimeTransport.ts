import type { PinnedTransport } from './security.ts';

export type RuntimeConnection = {
  read(buffer: Uint8Array): Promise<number | null>;
  write(data: Uint8Array): Promise<number>;
  close(): void;
};

type Connect = (options: { hostname: string; port: number; signal: AbortSignal }) => Promise<RuntimeConnection>;
type StartTls = (connection: RuntimeConnection, options: { hostname: string }) => Promise<RuntimeConnection>;

class SocketReader {
  private buffered = new Uint8Array();
  constructor(private readonly connection: RuntimeConnection) {}

  private async fill(): Promise<boolean> {
    const chunk = new Uint8Array(8192);
    const count = await this.connection.read(chunk);
    if (count === null) return false;
    const combined = new Uint8Array(this.buffered.length + count);
    combined.set(this.buffered);
    combined.set(chunk.subarray(0, count), this.buffered.length);
    this.buffered = combined;
    return true;
  }

  async line(limit = 65_536): Promise<string> {
    while (true) {
      for (let index = 0; index + 1 < this.buffered.length; index++) {
        if (this.buffered[index] === 13 && this.buffered[index + 1] === 10) {
          const line = new TextDecoder().decode(this.buffered.subarray(0, index));
          this.buffered = this.buffered.slice(index + 2);
          return line;
        }
      }
      if (this.buffered.length > limit || !await this.fill()) throw new Error('Invalid HTTP response framing');
    }
  }

  async exact(size: number): Promise<Uint8Array> {
    while (this.buffered.length < size) {
      if (!await this.fill()) throw new Error('Unexpected end of HTTP response');
    }
    const value = this.buffered.slice(0, size);
    this.buffered = this.buffered.slice(size);
    return value;
  }

  async rest(maxBytes: number): Promise<Uint8Array> {
    const chunks = [this.buffered];
    let size = this.buffered.length;
    this.buffered = new Uint8Array();
    if (size > maxBytes) throw new Error('Response body is too large');
    while (true) {
      const chunk = new Uint8Array(Math.min(8192, maxBytes - size + 1));
      const count = await this.connection.read(chunk);
      if (count === null) break;
      size += count;
      if (size > maxBytes) throw new Error('Response body is too large');
      chunks.push(chunk.slice(0, count));
    }
    return join(chunks, size);
  }
}

function join(chunks: Uint8Array[], size: number): Uint8Array {
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

async function writeAll(connection: RuntimeConnection, data: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < data.length) {
    const written = await connection.write(data.subarray(offset));
    if (written <= 0) throw new Error('Socket closed while writing request');
    offset += written;
  }
}

async function readBody(reader: SocketReader, headers: Headers, maxBytes: number): Promise<Uint8Array> {
  const transferEncoding = headers.get('transfer-encoding')?.toLowerCase() ?? '';
  if (transferEncoding.includes('chunked')) {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const rawSize = (await reader.line()).split(';', 1)[0].trim();
      const chunkSize = Number.parseInt(rawSize, 16);
      if (!Number.isFinite(chunkSize) || chunkSize < 0) throw new Error('Invalid chunked response');
      if (chunkSize === 0) {
        while (await reader.line()) { /* consume trailers */ }
        return join(chunks, size);
      }
      size += chunkSize;
      if (size > maxBytes) throw new Error('Response body is too large');
      chunks.push(await reader.exact(chunkSize));
      if (await reader.line() !== '') throw new Error('Invalid chunk delimiter');
    }
  }
  const lengthHeader = headers.get('content-length');
  if (lengthHeader !== null) {
    const length = Number(lengthHeader);
    if (!Number.isSafeInteger(length) || length < 0) throw new Error('Invalid content length');
    if (length > maxBytes) throw new Error('Response body is too large');
    return reader.exact(length);
  }
  return reader.rest(maxBytes);
}

export function createPinnedTransport(connect: Connect, startTls: StartTls): PinnedTransport {
  return async ({ url, approvedAddresses, signal, headers, maxBytes }) => {
    const destination = approvedAddresses[0];
    if (!destination) throw new Error('No approved destination');
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    const raw = await connect({ hostname: destination, port, signal });
    let connection = raw;
    const abort = () => connection.close();
    signal.addEventListener('abort', abort, { once: true });
    try {
      if (url.protocol === 'https:') connection = await startTls(raw, { hostname: url.hostname });
      signal.throwIfAborted();
      try {
        const defaultPort = url.protocol === 'https:' ? '443' : '80';
        const host = url.port && url.port !== defaultPort ? `${url.hostname}:${url.port}` : url.hostname;
        const requestHeaders = Object.entries(headers).map(([name, value]) => `${name}: ${value}`).join('\r\n');
        const request = `GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${host}\r\n${requestHeaders}\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`;
        await writeAll(connection, new TextEncoder().encode(request));
        const reader = new SocketReader(connection);
        const statusLine = await reader.line();
        const status = Number(/^HTTP\/1\.[01] (\d{3})(?: |$)/.exec(statusLine)?.[1]);
        if (!status) throw new Error('Invalid HTTP status line');
        const responseHeaders = new Headers();
        let headerBytes = statusLine.length;
        while (true) {
          const line = await reader.line();
          headerBytes += line.length + 2;
          if (headerBytes > 65_536) throw new Error('Response headers are too large');
          if (!line) break;
          const separator = line.indexOf(':');
          if (separator <= 0) throw new Error('Invalid HTTP response header');
          responseHeaders.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
        }
        const contentEncoding = responseHeaders.get('content-encoding');
        if (contentEncoding && contentEncoding.toLowerCase() !== 'identity') throw new Error('Unsupported response encoding');
        const body = [204, 304].includes(status) ? null : await readBody(reader, responseHeaders, maxBytes);
        const responseBody = body === null ? null : new Uint8Array(body).buffer;
        return new Response(responseBody, { status, headers: responseHeaders });
      } finally {
        connection.close();
      }
    } catch (error) {
      try { connection.close(); } catch { /* already closed */ }
      throw error;
    } finally { signal.removeEventListener('abort', abort); }
  };
}

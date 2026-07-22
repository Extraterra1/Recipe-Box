import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('PWA release updates', () => {
  it('checks for a new service worker whenever the app launches', () => {
    const entrypoint = read('src/main.tsx');

    expect(entrypoint).toContain("from 'virtual:pwa-register'");
    expect(entrypoint).toContain('immediate: true');
    expect(entrypoint).toContain('registration?.update()');
  });
});

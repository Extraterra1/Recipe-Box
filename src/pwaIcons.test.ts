import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function pngDimensions(path: string) {
  const image = readFileSync(join(process.cwd(), path));

  expect(image.subarray(1, 4).toString('ascii')).toBe('PNG');

  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20)
  };
}

describe('PWA icon family', () => {
  it('uses the selected recipe-box artwork at each required size', () => {
    expect(pngDimensions('public/favicon.png')).toEqual({ width: 64, height: 64 });
    expect(pngDimensions('public/apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
    expect(pngDimensions('public/pwa-icon.png')).toEqual({ width: 512, height: 512 });
  });

  it('references the PNG icon family from the page and manifest configuration', () => {
    const page = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(page).toContain('type="image/png" href="/favicon.png"');
    expect(page).toContain('href="/apple-touch-icon.png"');
    expect(config).toContain("includeAssets: ['favicon.png', 'apple-touch-icon.png']");
    expect(config).toContain("src: 'pwa-icon.png'");
    expect(config).toContain("type: 'image/png'");
  });
});

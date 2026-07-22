import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

describe('standalone authentication', () => {
  it('uses a full-height focused auth surface without decorative gradients', () => {
    expect(styles).toMatch(/\.auth-shell\s*\{[^}]*min-height:\s*100dvh;[^}]*display:\s*grid;/s);
    expect(styles).toMatch(/\.auth-surface\s*\{[^}]*width:\s*min\(100%, 420px\);/s);
    expect(styles).toMatch(/\.auth-google\s*\{[^}]*width:\s*100%;/s);
    expect(styles).not.toMatch(/\.auth-[^{]*\{[^}]*gradient\(/s);
  });
});

describe('search focus styling', () => {
  it('draws one aligned focus indicator on the search container', () => {
    expect(styles).toMatch(
      /\.search-wrap:focus-within\s*\{[^}]*outline:\s*2px solid var\(--accent\);[^}]*outline-offset:\s*2px;[^}]*\}/s,
    );
    expect(styles).toMatch(
      /\.search-wrap input:focus-visible\s*\{[^}]*outline:\s*none;[^}]*\}/s,
    );
  });
});

describe('mobile recipe panels', () => {
  it('shows the pill toggle and only its active panel below the mobile breakpoint', () => {
    expect(styles).toMatch(/\.recipe-panel-toggle\s*\{[^}]*display:\s*none;/s);
    expect(styles).toMatch(
      /@media \(max-width: 759px\)\s*\{[\s\S]*?\.recipe-panel-toggle\s*\{[^}]*display:\s*grid;[\s\S]*?\.recipe-reading-panel\[data-active="false"\]\s*\{[^}]*display:\s*none;/,
    );
  });

  it('slides one active indicator left and right between the pill options', () => {
    expect(styles).toMatch(
      /\.recipe-panel-toggle::before\s*\{[^}]*transition:\s*transform 320ms/s,
    );
    expect(styles).toMatch(/\.recipe-panel-toggle\[data-active="directions"\]::before\s*\{[^}]*transform:\s*translateX\(calc\(100% \+ 3px\)\)/s);
    expect(styles).toMatch(/\.recipe-panel-toggle button\[aria-selected="true"\]\s*\{[^}]*background:\s*transparent;/s);
    expect(styles).not.toMatch(/\.recipe-reading-panel[^}]*animation:/s);
  });
});

describe('mobile recipe tabs', () => {
  it('keeps the tab bar mobile-only and floats it above the safe area', () => {
    expect(styles).toMatch(/\.library-navigation,[^{]*\.mobile-recipe-tabs\s*\{\s*display:\s*none;/s);
    expect(styles).toMatch(
      /@media \(max-width: 759px\)\s*\{[\s\S]*?\.app-shell\s*\{[^}]*padding-bottom:\s*calc\(96px \+ env\(safe-area-inset-bottom\)\);[\s\S]*?\.mobile-recipe-tabs\s*\{[^}]*position:\s*fixed;[^}]*right:\s*max\(12px, env\(safe-area-inset-right\)\);[^}]*bottom:\s*max\(10px, env\(safe-area-inset-bottom\)\);[^}]*left:\s*max\(12px, env\(safe-area-inset-left\)\);[^}]*border-radius:\s*999px;/s,
    );
    expect(styles).toMatch(/\.mobile-recipe-tabs\s*\{[^}]*box-shadow:[^}]*backdrop-filter:\s*blur\(24px\) saturate\(180%\);/s);
  });

  it('uses two equal tab targets, a tinted selection lens, and an accessibility fallback', () => {
    expect(styles).toMatch(/\.mobile-recipe-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
    expect(styles).toMatch(/\.mobile-recipe-tabs button\s*\{[^}]*min-height:\s*52px;/s);
    expect(styles).toMatch(/\.mobile-recipe-tabs button\[aria-current="page"\]\s*\{[^}]*background:\s*color-mix\(in oklch, var\(--accent\) 12%, transparent\);[^}]*color:\s*var\(--accent\);/s);
    expect(styles).toMatch(/@media \(prefers-reduced-transparency: reduce\)\s*\{[^}]*\.mobile-recipe-tabs\s*\{[^}]*background:\s*var\(--canvas\);/s);
  });
});

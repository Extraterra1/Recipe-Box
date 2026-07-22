import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

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

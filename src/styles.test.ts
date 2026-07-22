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

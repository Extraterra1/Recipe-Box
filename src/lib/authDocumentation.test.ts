import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('authentication documentation and local configuration', () => {
  it('documents password and Google auth without an anonymous seeded mode', () => {
    const readme = read('README.md');
    expect(readme).toContain('Email/password and Google sign-in');
    expect(readme).toContain('https://dioqzlugpblppmcuttny.supabase.co/auth/v1/callback');
    expect(readme).not.toContain('Auth magic links');
    expect(readme).not.toContain('runs in local seeded mode');
  });

  it('keeps local email confirmation disabled', () => {
    const config = read('supabase/config.toml');
    expect(config).toMatch(/\[auth\.email\][\s\S]*enable_confirmations\s*=\s*false/);
  });
});

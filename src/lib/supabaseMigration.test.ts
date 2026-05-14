import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Supabase migration', () => {
  it('enables RLS and grants only authenticated table access', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260514160000_initial_recipe_box.sql'), 'utf8');

    expect(sql).toContain('alter table public.cookbooks enable row level security');
    expect(sql).toContain('alter table public.cookbook_members enable row level security');
    expect(sql).toContain('alter table public.recipes enable row level security');
    expect(sql).toContain('grant select, insert, update, delete on public.recipes to authenticated');
    expect(sql).not.toContain('service_role');
  });
});

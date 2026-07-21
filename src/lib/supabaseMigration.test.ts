import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Supabase migration', () => {
  const migrationsDirectory = join(process.cwd(), 'supabase/migrations');

  it('enables RLS and grants only authenticated table access', () => {
    const sql = readFileSync(join(migrationsDirectory, '20260514160000_initial_recipe_box.sql'), 'utf8');

    expect(sql).toContain('alter table public.cookbooks enable row level security');
    expect(sql).toContain('alter table public.cookbook_members enable row level security');
    expect(sql).toContain('alter table public.recipes enable row level security');
    expect(sql).toContain('grant select, insert, update, delete on public.recipes to authenticated');
    expect(sql).not.toContain('service_role');
  });

  it('creates cookbooks and owner memberships through an authenticated RPC', () => {
    const sql = readFileSync(join(migrationsDirectory, '20260721181556_create_cookbook_rpc.sql'), 'utf8');

    expect(sql).toContain('create or replace function public.create_cookbook_for_current_user');
    expect(sql).toContain('current_user_id uuid := auth.uid()');
    expect(sql).toContain("raise exception 'Sign in before creating a household.'");
    expect(sql).toContain('revoke all on function public.create_cookbook_for_current_user(text, text) from public');
    expect(sql).toContain('grant execute on function public.create_cookbook_for_current_user(text, text) to authenticated');
  });

  it('removes anonymous access to privileged functions and pins the trigger search path', () => {
    const sql = readFileSync(join(migrationsDirectory, '20260721182345_harden_function_permissions.sql'), 'utf8');

    expect(sql).toContain('revoke execute on function public.create_cookbook_for_current_user(text, text) from anon');
    expect(sql).toContain('revoke execute on function public.join_cookbook_by_invite(text) from anon');
    expect(sql).toContain('alter function public.set_updated_at() set search_path = public');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { ensureCookbook, seedRecipesIfNeeded } from './recipeService';
import { getSupabaseClient } from './supabaseClient';
import { getCachedRecipes } from './localDb';
import type { Recipe } from './types';

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
  hasSupabaseConfig: true
}));

vi.mock('./localDb', () => ({
  cacheRecipes: vi.fn(),
  deleteCachedRecipe: vi.fn(),
  getCachedRecipes: vi.fn(),
  upsertCachedRecipe: vi.fn()
}));

describe('ensureCookbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the first cookbook through the authenticated RPC', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const rpcSingle = vi.fn().mockResolvedValue({
      data: { id: 'cookbook-1', name: 'Household Recipe Box', invite_code: 'ABC12345', role: 'owner' },
      error: null
    });
    const rpc = vi.fn().mockReturnValue({ single: rpcSingle });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ maybeSingle })
        })
      })
    });

    vi.mocked(getSupabaseClient).mockResolvedValue({ from, rpc } as never);

    const session = { user: { id: 'user-1' } } as Session;
    const cookbook = await ensureCookbook(session);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('create_cookbook_for_current_user', {
      requested_name: 'Household Recipe Box',
      requested_invite_code: expect.stringMatching(/^[A-Z0-9]{8}$/)
    });
    expect(cookbook).toEqual({
      id: 'cookbook-1',
      name: 'Household Recipe Box',
      inviteCode: 'ABC12345',
      role: 'owner'
    });
  });

  it('requires an authenticated session instead of creating a local cookbook', async () => {
    await expect(ensureCookbook(null as never)).rejects.toThrow('Sign in before opening a household');
    expect(getSupabaseClient).not.toHaveBeenCalled();
  });
});

describe('seedRecipesIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries the remote seed when recipes were cached by a failed upload', async () => {
    const recipe: Recipe = {
      id: 'pancakes',
      cookbookId: 'cookbook-1',
      title: 'Pancakes',
      imageUrl: '',
      sourceLabel: '',
      sourceUrl: '',
      metadata: '',
      ingredients: ['Flour'],
      directions: [],
      notes: [],
      nutrition: [],
      tags: [],
      favorite: false,
      createdAt: '2026-05-14T00:00:00.000Z',
      updatedAt: '2026-05-14T00:00:00.000Z'
    };
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });

    vi.mocked(getCachedRecipes).mockResolvedValue([recipe]);
    vi.mocked(getSupabaseClient).mockResolvedValue({ from } as never);

    await seedRecipesIfNeeded('cookbook-1', [recipe]);

    expect(from).toHaveBeenCalledWith('recipes');
    expect(upsert).toHaveBeenCalledOnce();
  });
});

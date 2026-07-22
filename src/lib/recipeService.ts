import type { Session } from '@supabase/supabase-js';
import { cacheRecipes, deleteCachedRecipe, getCachedRecipes, upsertCachedRecipe } from './localDb';
import { fromRecipeRow, toRecipeInsert, type RecipeRow } from './supabaseMapping';
import type { Cookbook, Recipe } from './types';
import { getSupabaseClient, hasSupabaseConfig } from './supabaseClient';

type JoinCookbookResult = {
  id: string;
  name: string;
  invite_code: string;
  role: 'owner' | 'editor';
};

export async function ensureCookbook(session: Session): Promise<Cookbook> {
  if (!session) {
    throw new Error('Sign in before opening a household.');
  }
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('cookbook_members')
    .select('role, cookbooks(id, name, invite_code)')
    .eq('user_id', session.user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (membership?.cookbooks) {
    const cookbook = Array.isArray(membership.cookbooks) ? membership.cookbooks[0] : membership.cookbooks;
    return {
      id: cookbook.id,
      name: cookbook.name,
      inviteCode: cookbook.invite_code,
      role: membership.role
    };
  }

  const inviteCode = createInviteCode();
  const { data: cookbook, error: cookbookError } = await supabase.rpc('create_cookbook_for_current_user', {
    requested_name: 'Household Recipe Box',
    requested_invite_code: inviteCode
  }).single();

  if (cookbookError) {
    throw cookbookError;
  }

  const created = cookbook as JoinCookbookResult;
  return { id: created.id, name: created.name, inviteCode: created.invite_code, role: created.role };
}

export async function joinCookbookByInvite(session: Session | null, inviteCode: string): Promise<Cookbook> {
  const supabase = await getSupabaseClient();
  if (!supabase || !session) {
    throw new Error('Sign in before joining a household.');
  }

  const { data: cookbook, error } = await supabase.rpc('join_cookbook_by_invite', {
    requested_invite_code: inviteCode.trim().toUpperCase()
  }).single();

  if (error) {
    throw error;
  }

  const joined = cookbook as JoinCookbookResult;
  return { id: joined.id, name: joined.name, inviteCode: joined.invite_code, role: joined.role };
}

export async function loadRecipes(cookbookId: string): Promise<Recipe[]> {
  const supabase = await getSupabaseClient();
  const cached = await getCachedRecipes(cookbookId);

  if (!supabase || !hasSupabaseConfig || !navigator.onLine) {
    return cached;
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('cookbook_id', cookbookId)
    .order('title', { ascending: true });

  if (error) {
    if (cached.length) {
      return cached;
    }
    throw error;
  }

  const recipes = (data as RecipeRow[]).map(fromRecipeRow);
  await cacheRecipes(cookbookId, recipes);
  return recipes;
}

export async function seedRecipesIfNeeded(cookbookId: string, recipes: Recipe[]): Promise<Recipe[]> {
  const existing = await getCachedRecipes(cookbookId);
  const seeded = existing.length ? existing : recipes.map((recipe) => ({ ...recipe, cookbookId }));
  if (!existing.length) {
    await cacheRecipes(cookbookId, seeded);
  }

  const supabase = await getSupabaseClient();
  if (supabase && hasSupabaseConfig && navigator.onLine) {
    const recipes = supabase.from('recipes');
    const { data: remoteRecipes, error: lookupError } = await recipes
      .select('id')
      .eq('cookbook_id', cookbookId)
      .limit(1);
    if (lookupError) {
      throw lookupError;
    }

    if (!remoteRecipes?.length) {
      const inserts = seeded.map((recipe) => toRecipeInsert(recipe, cookbookId));
      const { error } = await recipes.upsert(inserts, { onConflict: 'cookbook_id,title' });
      if (error) {
        throw error;
      }
    }
  }

  return seeded;
}

export async function saveRecipe(cookbookId: string, recipe: Recipe): Promise<Recipe> {
  const next = {
    ...recipe,
    cookbookId,
    updatedAt: new Date().toISOString()
  };

  const supabase = await getSupabaseClient();
  if (supabase && hasSupabaseConfig && navigator.onLine) {
    const recipes = supabase.from('recipes');
    const saveQuery = isRemoteRecipeId(next.id)
      ? recipes.update(toRecipeInsert(next, cookbookId)).eq('id', next.id).eq('cookbook_id', cookbookId)
      : recipes.upsert(toRecipeInsert(next, cookbookId), { onConflict: 'cookbook_id,title' });
    const { data, error } = await saveQuery.select('*').single();

    if (error) {
      throw error;
    }

    const remote = fromRecipeRow(data as RecipeRow);
    await upsertCachedRecipe(cookbookId, remote);
    return remote;
  }

  await upsertCachedRecipe(cookbookId, next);
  return next;
}

export async function removeRecipe(cookbookId: string, recipeId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  if (supabase && hasSupabaseConfig && navigator.onLine) {
    const { error } = await supabase.from('recipes').delete().eq('id', recipeId).eq('cookbook_id', cookbookId);
    if (error) {
      throw error;
    }
  }

  await deleteCachedRecipe(cookbookId, recipeId);
}

function createInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 8)
    .toUpperCase();
}

function isRemoteRecipeId(recipeId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipeId);
}

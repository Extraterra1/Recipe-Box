import type { Session } from '@supabase/supabase-js';
import { cacheRecipes, deleteCachedRecipe, getCachedRecipes, upsertCachedRecipe } from './localDb';
import { fromRecipeRow, toRecipeInsert, type RecipeRow } from './supabaseMapping';
import type { Cookbook, Recipe } from './types';
import { getSupabaseClient, hasSupabaseConfig } from './supabaseClient';

const LOCAL_COOKBOOK_ID = 'local-household';

type JoinCookbookResult = {
  id: string;
  name: string;
  invite_code: string;
  role: 'editor';
};

export async function getSession(): Promise<Session | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signInWithMagicLink(email: string): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function ensureCookbook(session: Session | null): Promise<Cookbook> {
  const supabase = await getSupabaseClient();
  if (!supabase || !session) {
    return { id: LOCAL_COOKBOOK_ID, name: 'Household Recipe Box', role: 'owner', inviteCode: 'LOCAL' };
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
  const { data: cookbook, error: cookbookError } = await supabase
    .from('cookbooks')
    .insert({ name: 'Household Recipe Box', owner_id: session.user.id, invite_code: inviteCode })
    .select('id, name, invite_code')
    .single();

  if (cookbookError) {
    throw cookbookError;
  }

  const { error: memberError } = await supabase.from('cookbook_members').insert({
    cookbook_id: cookbook.id,
    user_id: session.user.id,
    role: 'owner'
  });

  if (memberError) {
    throw memberError;
  }

  return { id: cookbook.id, name: cookbook.name, inviteCode: cookbook.invite_code, role: 'owner' };
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
  if (existing.length) {
    return existing;
  }

  const seeded = recipes.map((recipe) => ({ ...recipe, cookbookId }));
  await cacheRecipes(cookbookId, seeded);

  const supabase = await getSupabaseClient();
  if (supabase && hasSupabaseConfig && navigator.onLine && cookbookId !== LOCAL_COOKBOOK_ID) {
    const inserts = seeded.map((recipe) => toRecipeInsert(recipe, cookbookId));
    const { error } = await supabase.from('recipes').upsert(inserts, { onConflict: 'cookbook_id,title' });
    if (error) {
      throw error;
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
  if (supabase && hasSupabaseConfig && navigator.onLine && cookbookId !== LOCAL_COOKBOOK_ID) {
    const { data, error } = await supabase
      .from('recipes')
      .upsert(toRecipeInsert(next, cookbookId), { onConflict: 'cookbook_id,title' })
      .select('*')
      .single();

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
  if (supabase && hasSupabaseConfig && navigator.onLine && cookbookId !== LOCAL_COOKBOOK_ID) {
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

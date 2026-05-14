import Dexie, { type EntityTable } from 'dexie';
import type { Cookbook, Recipe } from './types';

type CachedRecipe = Recipe & {
  cacheKey: string;
  cookbookId: string;
};

type SyncMeta = {
  id: string;
  value: string;
  updatedAt: string;
};

class RecipeBoxDatabase extends Dexie {
  recipes!: EntityTable<CachedRecipe, 'cacheKey'>;
  cookbooks!: EntityTable<Cookbook, 'id'>;
  meta!: EntityTable<SyncMeta, 'id'>;

  constructor() {
    super('RecipeBox');
    this.version(1).stores({
      recipes: 'cacheKey, id, cookbookId, title, updatedAt, favorite, *tags',
      cookbooks: 'id, name, role',
      meta: 'id'
    });
  }
}

export const db = new RecipeBoxDatabase();

export async function cacheRecipes(cookbookId: string, recipes: Recipe[]): Promise<void> {
  const cached = recipes.map((recipe) => ({
    ...recipe,
    cookbookId,
    cacheKey: `${cookbookId}:${recipe.id}`
  }));

  await db.transaction('rw', db.recipes, db.meta, async () => {
    await db.recipes.where('cookbookId').equals(cookbookId).delete();
    await db.recipes.bulkPut(cached);
    await db.meta.put({
      id: `last-sync:${cookbookId}`,
      value: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

export async function upsertCachedRecipe(cookbookId: string, recipe: Recipe): Promise<void> {
  await db.recipes.put({
    ...recipe,
    cookbookId,
    cacheKey: `${cookbookId}:${recipe.id}`
  });
}

export async function deleteCachedRecipe(cookbookId: string, recipeId: string): Promise<void> {
  await db.recipes.delete(`${cookbookId}:${recipeId}`);
}

export async function getCachedRecipes(cookbookId: string): Promise<Recipe[]> {
  const recipes = await db.recipes.where('cookbookId').equals(cookbookId).sortBy('title');
  return recipes.map(({ cacheKey: _cacheKey, ...recipe }) => recipe);
}

export async function clearRecipeCache(): Promise<void> {
  await db.recipes.clear();
  await db.cookbooks.clear();
  await db.meta.clear();
}

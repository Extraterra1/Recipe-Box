import { afterEach, describe, expect, it } from 'vitest';
import { cacheRecipes, clearRecipeCache, getCachedRecipes } from './localDb';
import type { Recipe } from './types';

const recipe: Recipe = {
  id: 'cached-1',
  cookbookId: 'cookbook-1',
  title: 'Honey Garlic Chicken Breast',
  imageUrl: '',
  sourceLabel: '',
  sourceUrl: '',
  metadata: '',
  ingredients: ['chicken', 'honey', 'garlic'],
  directions: ['Cook.'],
  notes: [],
  nutrition: [],
  tags: ['chicken'],
  favorite: false,
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z'
};

describe('local recipe cache', () => {
  afterEach(async () => {
    await clearRecipeCache();
  });

  it('stores and reads recipes by cookbook for offline use', async () => {
    await cacheRecipes('cookbook-1', [recipe]);
    await cacheRecipes('cookbook-2', [{ ...recipe, id: 'other', cookbookId: 'cookbook-2' }]);

    const cached = await getCachedRecipes('cookbook-1');

    expect(cached).toHaveLength(1);
    expect(cached[0].title).toBe('Honey Garlic Chicken Breast');
  });
});

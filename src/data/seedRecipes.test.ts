import { describe, expect, it } from 'vitest';
import { seedRecipes } from './seedRecipes';

describe('seed recipes', () => {
  it('uses unique ids and titles for database upserts and local caching', () => {
    const ids = seedRecipes.map((recipe) => recipe.id);
    const titles = seedRecipes.map((recipe) => recipe.title);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

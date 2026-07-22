import { describe, expect, it } from 'vitest';
import { importRecipe } from './service';

describe('importRecipe', () => {
  it('returns INVALID_URL for a missing URL', async () => {
    await expect(importRecipe({}, { resolveHost: async () => [], fetcher: fetch })).rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  it('maps a page without recipe data to RECIPE_NOT_FOUND', async () => {
    await expect(importRecipe({ url: 'https://example.com/post' }, {
      resolveHost: async () => ['93.184.216.34'],
      fetcher: async () => new Response('<p>No recipe here</p>', { headers: { 'content-type': 'text/html' } }),
    })).rejects.toMatchObject({ code: 'RECIPE_NOT_FOUND' });
  });
});

import { describe, expect, it } from 'vitest';
import { fromRecipeRow, toRecipeInsert } from './supabaseMapping';
import type { Recipe } from './types';

describe('Supabase recipe mapping', () => {
  it('maps app recipes to database rows and back without changing arrays', () => {
    const recipe: Recipe = {
      id: 'local-1',
      cookbookId: 'cookbook-1',
      title: 'Ciabatta',
      imageUrl: 'https://example.test/ciabatta.jpg',
      sourceLabel: 'Kitchen Notes',
      sourceUrl: 'https://example.test/ciabatta',
      metadata: 'Makes 2 loaves',
      ingredients: ['500g flour', '400g water'],
      directions: ['Mix.', 'Bake.'],
      notes: ['Wet dough.'],
      nutrition: [],
      tags: ['bread'],
      favorite: true,
      createdAt: '2026-05-14T00:00:00.000Z',
      updatedAt: '2026-05-14T00:00:00.000Z'
    };

    const insert = toRecipeInsert(recipe, 'cookbook-1');

    expect(insert).toMatchObject({
      cookbook_id: 'cookbook-1',
      title: 'Ciabatta',
      image_url: 'https://example.test/ciabatta.jpg',
      ingredients: ['500g flour', '400g water'],
      directions: ['Mix.', 'Bake.'],
      favorite: true
    });

    expect(fromRecipeRow({ ...insert, id: 'remote-1', created_at: recipe.createdAt, updated_at: recipe.updatedAt })).toMatchObject({
      id: 'remote-1',
      cookbookId: 'cookbook-1',
      title: 'Ciabatta',
      imageUrl: 'https://example.test/ciabatta.jpg',
      ingredients: ['500g flour', '400g water'],
      favorite: true
    });
  });
});

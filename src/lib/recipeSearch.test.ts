import { describe, expect, it } from 'vitest';
import { filterRecipes, getAllTags } from './recipeSearch';
import type { Recipe } from './types';

const recipes: Recipe[] = [
  {
    id: 'pizza',
    title: 'NYC Pizza',
    sourceLabel: 'Brian Lagerstrom',
    sourceUrl: '',
    metadata: '',
    ingredients: ['poolish', 'tomato sauce', 'mozzarella'],
    directions: ['Bake hot.'],
    notes: [],
    nutrition: [],
    tags: ['pizza', 'bread'],
    favorite: true,
    createdAt: '2026-05-14T00:00:00.000Z',
    updatedAt: '2026-05-14T00:00:00.000Z'
  },
  {
    id: 'smoothie',
    title: 'Breakfast Fruit Smoothie',
    sourceLabel: '',
    sourceUrl: '',
    metadata: '',
    ingredients: ['banana', 'oats'],
    directions: ['Blend.'],
    notes: [],
    nutrition: [],
    tags: ['breakfast', 'drink'],
    favorite: false,
    createdAt: '2026-05-14T00:00:00.000Z',
    updatedAt: '2026-05-14T00:00:00.000Z'
  }
];

describe('filterRecipes', () => {
  it('searches title, source, ingredients, tags, and favorite state', () => {
    expect(filterRecipes(recipes, { query: 'lagerstrom', tags: [], favoritesOnly: false })).toHaveLength(1);
    expect(filterRecipes(recipes, { query: 'banana', tags: [], favoritesOnly: false })[0].id).toBe('smoothie');
    expect(filterRecipes(recipes, { query: '', tags: ['pizza'], favoritesOnly: false })[0].id).toBe('pizza');
    expect(filterRecipes(recipes, { query: '', tags: [], favoritesOnly: true })[0].id).toBe('pizza');
  });
});

describe('getAllTags', () => {
  it('returns unique sorted tags', () => {
    expect(getAllTags(recipes)).toEqual(['bread', 'breakfast', 'drink', 'pizza']);
  });
});

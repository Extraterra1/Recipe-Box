import { describe, expect, it } from 'vitest';
import { exportRecipesAsMarkdown, parseRecipeMarkdown } from './markdown';

describe('parseRecipeMarkdown', () => {
  it('extracts recipe metadata and sections from Paprika-style Markdown', () => {
    const recipe = parseRecipeMarkdown(`# Pancakes

Source: [Weekend Kitchen](https://example.test/pancakes)

Prep 10 min Cook 8 min Servings: 4

## Ingredients

- **200**g flour
- 2 eggs

## Directions

1. Whisk everything.
2. Cook until golden.

## Notes

- Rest batter for 10 minutes.

## Nutrition

- Good breakfast energy.
`);

    expect(recipe.title).toBe('Pancakes');
    expect(recipe.imageUrl).toBe('');
    expect(recipe.sourceLabel).toBe('Weekend Kitchen');
    expect(recipe.sourceUrl).toBe('https://example.test/pancakes');
    expect(recipe.metadata).toBe('Prep 10 min Cook 8 min Servings: 4');
    expect(recipe.ingredients).toEqual(['200g flour', '2 eggs']);
    expect(recipe.directions).toEqual(['Whisk everything.', 'Cook until golden.']);
    expect(recipe.notes).toEqual(['Rest batter for 10 minutes.']);
    expect(recipe.nutrition).toEqual(['Good breakfast energy.']);
    expect(recipe.tags).toContain('breakfast');
  });
});

describe('exportRecipesAsMarkdown', () => {
  it('exports sections without losing source links or notes', () => {
    const markdown = exportRecipesAsMarkdown([
      {
        id: 'recipe-1',
        title: 'Pancakes',
        imageUrl: '',
        sourceLabel: 'Weekend Kitchen',
        sourceUrl: 'https://example.test/pancakes',
        metadata: 'Servings: 4',
        ingredients: ['200g flour'],
        directions: ['Whisk everything.'],
        notes: ['Rest batter.'],
        nutrition: [],
        tags: ['breakfast'],
        favorite: false,
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z'
      }
    ]);

    expect(markdown).toContain('# Pancakes');
    expect(markdown).toContain('Source: [Weekend Kitchen](https://example.test/pancakes)');
    expect(markdown).toContain('## Ingredients');
    expect(markdown).toContain('- 200g flour');
    expect(markdown).toContain('1. Whisk everything.');
    expect(markdown).toContain('## Notes');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipeHtml, RecipeParseError } from './parser';

const fixture = (name: string) => readFileSync(`supabase/functions/import-recipe/fixtures/${name}`, 'utf8');

describe('parseRecipeHtml', () => {
  it('normalizes Recipe JSON-LD from an @graph with nested sections', () => {
    const draft = parseRecipeHtml(fixture('joshua-weissman.html'), 'https://www.joshuaweissman.com/recipes/perfect-nashville-hot-fried-chicken-at-home-2-ways-recipe');
    expect(draft).toMatchObject({
      title: 'Perfect Nashville Hot Fried Chicken',
      imageUrl: 'https://example.com/chicken.jpg',
      sourceLabel: 'Joshua Weissman',
      sourceUrl: 'https://www.joshuaweissman.com/recipes/perfect-nashville-hot-fried-chicken-at-home-2-ways-recipe',
      ingredients: ['2 lb chicken', '2 cups buttermilk'],
      directions: ['Chicken', 'Marinate the chicken.', 'Fry: Fry until crisp.', 'Hot oil', 'Whisk spices into oil.'],
      nutrition: ['Calories: 640 calories', 'Protein: 42 g'],
      tags: ['Dinner', 'American', 'chicken', 'spicy'],
      favorite: false,
    });
    expect(draft.metadata).toContain('4 servings');
    expect(draft.metadata).toContain('1 hr 15 min');
  });

  it('finds Recipe nodes in top-level arrays and tolerates malformed JSON-LD siblings', () => {
    const html = `<script type="application/ld+json">not json</script><script type="application/ld+json">[{"@type":"Thing"},{"@type":["Thing","Recipe"],"name":"Toast","recipeIngredient":"1 slice bread","recipeInstructions":"Toast it."}]</script>`;
    expect(parseRecipeHtml(html, 'https://example.com/toast')).toMatchObject({ title: 'Toast', ingredients: ['1 slice bread'], directions: ['Toast it.'] });
  });

  it('uses the narrowly scoped Elara recipe-card fallback', () => {
    const draft = parseRecipeHtml(fixture('sage-bakes.html'), 'https://sagebakes.com/cheesy-garlic-rolls/#elara-recipe');
    expect(draft).toMatchObject({
      title: 'Cheesy Garlic Rolls',
      imageUrl: 'https://sagebakes.com/images/cheesy-garlic-rolls.jpg',
      sourceLabel: 'Sage Bakes',
      ingredients: ['Dough', '3 cups bread flour', '1 cup warm milk', 'Filling', '4 cloves garlic, minced', '1 cup mozzarella'],
      directions: ['Make the dough', 'Mix the flour and milk.', 'Knead until smooth.', 'Shape and bake', 'Fill and roll the dough.', 'Bake until golden.'],
    });
  });

  it('does not invent absent optional fields', () => {
    const draft = parseRecipeHtml('<script type="application/ld+json">{"@type":"Recipe","name":"Water","recipeIngredient":[]}</script>', 'https://example.com/water');
    expect(draft).toEqual({ title: 'Water', imageUrl: '', sourceLabel: 'example.com', sourceUrl: 'https://example.com/water', metadata: '', ingredients: [], directions: [], notes: [], nutrition: [], tags: [], favorite: false });
  });

  it('reports pages without a usable recipe', () => {
    expect(() => parseRecipeHtml('<p>Hello</p>', 'https://example.com')).toThrowError(RecipeParseError);
  });
});

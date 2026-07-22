import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipeHtml, RecipeParseError } from './parser';

const fixture = (name: string) => readFileSync(`supabase/functions/import-recipe/fixtures/${name}`, 'utf8');

describe('parseRecipeHtml', () => {
  it('merges the supplied Joshua server HTML into a substantive draft', () => {
    const draft = parseRecipeHtml(fixture('joshua-weissman.html'), 'https://www.joshuaweissman.com/recipes/perfect-nashville-hot-fried-chicken-at-home-2-ways-recipe');
    expect(draft).toMatchObject({
      title: 'Perfect Nashville Hot Fried Chicken at Home (2 Ways)',
      imageUrl: 'https://cdn.example.com/chicken.jpg',
      sourceLabel: 'Joshua Weissman',
      sourceUrl: 'https://www.joshuaweissman.com/recipes/perfect-nashville-hot-fried-chicken-at-home-2-ways-recipe',
      ingredients: ['Leg Quarter Marinade', '2 cups buttermilk', '4 chicken leg quarters', 'Dredge', '3 cups all-purpose flour'],
      directions: ['Marinade', 'Whisk the marinade and add the chicken.', 'Frying', 'Dredge and fry until crisp.', 'Brush with hot oil.'],
      tags: ['fried chicken', 'spicy'],
      favorite: false,
    });
    expect(draft.metadata).toContain('4');
    expect(draft.metadata).toContain('1 hr 15 min');
  });

  it('normalizes ISO and human-readable durations', () => {
    const cases = [['PT75M', '1 hr 15 min'], ['30 min', '30 min'], ['45 mins', '45 min'], ['1 hr, 15 mins', '1 hr 15 min']];
    for (const [value, expected] of cases) {
      const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Timed","totalTime":"${value}"}</script>`;
      expect(parseRecipeHtml(html, 'https://example.com').metadata).toBe(expected);
    }
  });

  it('continues past an unusable Recipe node to a later valid one', () => {
    const html = `<script type="application/ld+json">[{"@type":"Recipe","name":"Empty"},{"@type":"Recipe","name":"Valid","recipeIngredient":["one"]}]</script>`;
    expect(parseRecipeHtml(html, 'https://example.com')).toMatchObject({ title: 'Valid', ingredients: ['one'] });
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

  it('rejects Sage-like markers split across unrelated elements', () => {
    const html = `<div id="elara-recipe"></div><div class="lt-recipe"><h4 itemprop="name">Fake</h4></div><aside itemtype="http://schema.org/Recipe"></aside>`;
    expect(() => parseRecipeHtml(html, 'https://sagebakes.com/not-a-recipe')).toThrowError(RecipeParseError);
  });

  it('rejects an unrelated Sage marker elsewhere on the page', () => {
    const html = `<div id="elara-recipe"></div><main>unrelated content</main><div class="lt-recipe" id="lt-recipe" itemscope itemtype="http://schema.org/Recipe"><h4 itemprop="name">Fake</h4></div>`;
    expect(() => parseRecipeHtml(html, 'https://sagebakes.com/not-a-recipe')).toThrowError(RecipeParseError);
  });
});

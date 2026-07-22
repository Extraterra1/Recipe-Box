import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from './supabaseClient';
import {
  getRecipeImportAvailability,
  importRecipeFromUrl,
  normalizeRecipeUrl,
  RecipeImportError
} from './recipeImport';

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
  hasSupabaseConfig: true
}));

describe('recipe URL import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('normalizes a public HTTP URL and removes its fragment', () => {
    expect(normalizeRecipeUrl('  https://sagebakes.com/cheesy-garlic-rolls/#elara-recipe  ')).toBe(
      'https://sagebakes.com/cheesy-garlic-rolls/'
    );
  });

  it.each(['not a URL', 'ftp://example.com/recipe', ''])('rejects invalid recipe URL %j', (url) => {
    expect(() => normalizeRecipeUrl(url)).toThrowError(
      expect.objectContaining({ code: 'INVALID_URL', message: 'Enter a valid recipe link.' })
    );
  });

  it('reports when import is offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(getRecipeImportAvailability()).toEqual({
      available: false,
      reason: 'Connect to the internet to import a recipe.'
    });
  });

  it('invokes the lazy authenticated function and returns a safe draft', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        recipe: {
          title: ' Cheesy Garlic Rolls ',
          imageUrl: 'https://example.com/rolls.jpg',
          sourceLabel: 'Sage Bakes',
          sourceUrl: 'https://sagebakes.com/cheesy-garlic-rolls/',
          metadata: '12 rolls',
          ingredients: [' 2 cups flour ', '', 4],
          directions: [' Mix ', 'Bake'],
          notes: null,
          nutrition: ['Calories: 200'],
          tags: ['Bread']
        }
      },
      error: null
    });
    vi.mocked(getSupabaseClient).mockResolvedValue({ functions: { invoke } } as never);

    await expect(importRecipeFromUrl('https://sagebakes.com/cheesy-garlic-rolls/#elara-recipe')).resolves.toEqual({
      title: 'Cheesy Garlic Rolls',
      imageUrl: 'https://example.com/rolls.jpg',
      sourceLabel: 'Sage Bakes',
      sourceUrl: 'https://sagebakes.com/cheesy-garlic-rolls/',
      metadata: '12 rolls',
      ingredients: ['2 cups flour'],
      directions: ['Mix', 'Bake'],
      notes: [],
      nutrition: ['Calories: 200'],
      tags: ['Bread'],
      favorite: false
    });
    expect(invoke).toHaveBeenCalledWith('import-recipe', {
      body: { url: 'https://sagebakes.com/cheesy-garlic-rolls/' }
    });
  });

  it.each([
    ['INVALID_URL', 'Enter a valid recipe link.'],
    ['BLOCKED_URL', 'That recipe link cannot be accessed.'],
    ['FETCH_FAILED', 'The recipe page could not be reached. Try again.'],
    ['UNSUPPORTED_CONTENT', 'That link does not point to a supported recipe page.'],
    ['RECIPE_NOT_FOUND', 'No recipe could be found on that page.'],
    ['PARSE_FAILED', 'The recipe page could not be read. Try another link.']
  ] as const)('maps backend code %s to safe copy', async (code, message) => {
    const invoke = vi.fn().mockResolvedValue({ data: { code }, error: { message: 'internal upstream detail' } });
    vi.mocked(getSupabaseClient).mockResolvedValue({ functions: { invoke } } as never);

    await expect(importRecipeFromUrl('https://example.com/recipe')).rejects.toEqual(
      expect.objectContaining({ code, message })
    );
  });

  it('uses a safe error for malformed responses and network failures', async () => {
    const invoke = vi.fn().mockResolvedValueOnce({ data: { recipe: { title: '' } }, error: null }).mockRejectedValueOnce(
      new Error('secret network detail')
    );
    vi.mocked(getSupabaseClient).mockResolvedValue({ functions: { invoke } } as never);

    await expect(importRecipeFromUrl('https://example.com/recipe')).rejects.toEqual(
      expect.objectContaining({ code: 'PARSE_FAILED', message: 'The recipe page returned an unreadable recipe.' })
    );
    await expect(importRecipeFromUrl('https://example.com/recipe')).rejects.toEqual(
      expect.objectContaining({ code: 'FETCH_FAILED', message: 'The recipe page could not be reached. Try again.' })
    );
  });

  it('fails safely when cloud import is unavailable', async () => {
    vi.mocked(getSupabaseClient).mockResolvedValue(null);
    await expect(importRecipeFromUrl('https://example.com/recipe')).rejects.toBeInstanceOf(RecipeImportError);
    await expect(importRecipeFromUrl('https://example.com/recipe')).rejects.toEqual(
      expect.objectContaining({ code: 'UNAVAILABLE', message: 'Cloud import is not configured.' })
    );
  });

  it('does not expose authentication or client initialization errors', async () => {
    vi.mocked(getSupabaseClient).mockRejectedValue(new Error('expired jwt: private detail'));
    await expect(importRecipeFromUrl('https://example.com/recipe')).rejects.toEqual(
      expect.objectContaining({ code: 'FETCH_FAILED', message: 'The recipe page could not be reached. Try again.' })
    );
  });
});

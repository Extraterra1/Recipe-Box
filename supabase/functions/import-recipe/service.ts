import { parseRecipeHtml, RecipeParseError, type ImportedRecipeDraft } from './parser.ts';
import { fetchRecipePage, ImportError, type ResolveHost } from './security.ts';

type ImportDependencies = { resolveHost: ResolveHost; fetcher?: typeof fetch };

export async function importRecipe(body: unknown, dependencies: ImportDependencies): Promise<ImportedRecipeDraft> {
  const url = body && typeof body === 'object' && 'url' in body ? (body as { url?: unknown }).url : undefined;
  if (typeof url !== 'string' || !url.trim()) throw new ImportError('INVALID_URL', 'Enter a recipe URL.');
  const page = await fetchRecipePage(url.trim(), { resolveHost: dependencies.resolveHost, fetcher: dependencies.fetcher });
  try {
    return parseRecipeHtml(page.html, page.finalUrl);
  } catch (error) {
    if (error instanceof RecipeParseError) throw new ImportError('RECIPE_NOT_FOUND', error.message, 422);
    throw new ImportError('PARSE_FAILED', 'The recipe page could not be read.', 422);
  }
}

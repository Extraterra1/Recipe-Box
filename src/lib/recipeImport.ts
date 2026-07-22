import { getSupabaseClient, hasSupabaseConfig } from './supabaseClient';
import type { RecipeDraft } from './types';

export type RecipeImportBackendCode =
  | 'INVALID_URL'
  | 'BLOCKED_URL'
  | 'FETCH_FAILED'
  | 'UNSUPPORTED_CONTENT'
  | 'RECIPE_NOT_FOUND'
  | 'PARSE_FAILED';

export type RecipeImportErrorCode = RecipeImportBackendCode | 'UNAVAILABLE';

const errorMessages: Record<RecipeImportErrorCode, string> = {
  INVALID_URL: 'Enter a valid recipe link.',
  BLOCKED_URL: 'That recipe link cannot be accessed.',
  FETCH_FAILED: 'The recipe page could not be reached. Try again.',
  UNSUPPORTED_CONTENT: 'That link does not point to a supported recipe page.',
  RECIPE_NOT_FOUND: 'No recipe could be found on that page.',
  PARSE_FAILED: 'The recipe page could not be read. Try another link.',
  UNAVAILABLE: 'Cloud import is not configured.'
};

export class RecipeImportError extends Error {
  constructor(public readonly code: RecipeImportErrorCode, message = errorMessages[code]) {
    super(message);
    this.name = 'RecipeImportError';
  }
}

export type RecipeImportAvailability =
  | { available: true; reason?: undefined }
  | { available: false; reason: string };

export function getRecipeImportAvailability(): RecipeImportAvailability {
  if (!hasSupabaseConfig) {
    return { available: false, reason: 'Cloud import is not configured.' };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { available: false, reason: 'Connect to the internet to import a recipe.' };
  }
  return { available: true };
}

export function normalizeRecipeUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new RecipeImportError('INVALID_URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RecipeImportError('INVALID_URL');
  }
  url.hash = '';
  return url.href;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

function toDraft(payload: unknown): RecipeDraft {
  if (!isRecord(payload)) {
    throw new RecipeImportError('PARSE_FAILED', 'The recipe page returned an unreadable recipe.');
  }
  const title = cleanString(payload.title);
  if (!title) {
    throw new RecipeImportError('PARSE_FAILED', 'The recipe page returned an unreadable recipe.');
  }
  return {
    title,
    imageUrl: cleanString(payload.imageUrl),
    sourceLabel: cleanString(payload.sourceLabel),
    sourceUrl: cleanString(payload.sourceUrl),
    metadata: cleanString(payload.metadata),
    ingredients: cleanList(payload.ingredients),
    directions: cleanList(payload.directions),
    notes: cleanList(payload.notes),
    nutrition: cleanList(payload.nutrition),
    tags: cleanList(payload.tags),
    favorite: false
  };
}

function backendCode(payload: unknown): RecipeImportBackendCode | null {
  if (!isRecord(payload)) return null;
  const candidate = isRecord(payload.error) ? payload.error.code : payload.code;
  return typeof candidate === 'string' && candidate in errorMessages && candidate !== 'UNAVAILABLE'
    ? (candidate as RecipeImportBackendCode)
    : null;
}

async function codeFromErrorContext(error: unknown): Promise<RecipeImportBackendCode | null> {
  if (!isRecord(error) || !('context' in error)) return null;
  const context = error.context;
  if (isRecord(context) && typeof context.json === 'function') {
    try {
      return backendCode(await (context.json as () => Promise<unknown>)());
    } catch {
      return null;
    }
  }
  return backendCode(context);
}

export async function importRecipeFromUrl(value: string): Promise<RecipeDraft> {
  const url = normalizeRecipeUrl(value);
  const availability = getRecipeImportAvailability();
  if (!availability.available) {
    throw new RecipeImportError('UNAVAILABLE', availability.reason);
  }

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new RecipeImportError('UNAVAILABLE');
    const { data, error } = await supabase.functions.invoke('import-recipe', { body: { url } });
    const code = backendCode(data) ?? (await codeFromErrorContext(error));
    if (code) throw new RecipeImportError(code);
    if (error) throw new RecipeImportError('FETCH_FAILED');
    return toDraft(isRecord(data) ? data.recipe : null);
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    throw new RecipeImportError('FETCH_FAILED');
  }
}

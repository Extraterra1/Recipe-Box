export type ImportedRecipeDraft = {
  title: string;
  imageUrl: string;
  sourceLabel: string;
  sourceUrl: string;
  metadata: string;
  ingredients: string[];
  directions: string[];
  notes: string[];
  nutrition: string[];
  tags: string[];
  favorite: false;
};

export class RecipeParseError extends Error {}

type JsonRecord = Record<string, unknown>;

const text = (value: unknown): string => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const record = (value: unknown): value is JsonRecord => !!value && typeof value === 'object' && !Array.isArray(value);

function isRecipe(value: unknown): value is JsonRecord {
  if (!record(value)) return false;
  return list(value['@type']).some((type) => typeof type === 'string' && type.toLowerCase() === 'recipe');
}

function findRecipes(value: unknown, recipes: JsonRecord[] = []): JsonRecord[] {
  if (isRecipe(value)) recipes.push(value);
  if (Array.isArray(value)) {
    for (const child of value) findRecipes(child, recipes);
  } else if (record(value) && Array.isArray(value['@graph'])) {
    findRecipes(value['@graph'], recipes);
  }
  return recipes;
}

function imageUrl(value: unknown): string {
  for (const image of list(value)) {
    if (typeof image === 'string') return image;
    if (record(image)) {
      const url = text(image.url) || text(image.contentUrl);
      if (url) return url;
    }
  }
  return '';
}

function instructionLines(value: unknown): string[] {
  const lines: string[] = [];
  for (const item of list(value)) {
    if (typeof item === 'string') {
      if (text(item)) lines.push(text(item));
      continue;
    }
    if (!record(item)) continue;
    const type = list(item['@type']).map(String);
    if (type.includes('HowToSection')) {
      const heading = text(item.name);
      if (heading) lines.push(heading);
      lines.push(...instructionLines(item.itemListElement));
      continue;
    }
    const body = text(item.text) || text(item.description);
    const name = text(item.name);
    if (body) lines.push(name && name !== body ? `${name}: ${body}` : body);
  }
  return lines;
}

function durationMinutes(value: unknown): number {
  const raw = text(value);
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i.exec(raw);
  if (match) return Number(match[1] || 0) * 1440 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  const hours = /(?:^|[\s,])(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i.exec(raw);
  const minutes = /(?:^|[\s,])(\d+)\s*(?:m|min|mins|minute|minutes)\b/i.exec(raw);
  return Math.round(Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0));
}

function displayDuration(minutes: number): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return [hours ? `${hours} hr` : '', mins ? `${mins} min` : ''].filter(Boolean).join(' ');
}

function sourceName(recipe: JsonRecord, url: URL): string {
  const author = recipe.author;
  const name = record(author) ? text(author.name) : text(author);
  return name || url.hostname.replace(/^www\./, '');
}

function fromJsonLd(recipe: JsonRecord, sourceUrl: string): ImportedRecipeDraft | undefined {
  const title = text(recipe.name) || text(recipe.headline);
  if (!title) return undefined;
  const url = new URL(sourceUrl);
  const totalMinutes = durationMinutes(recipe.totalTime) || durationMinutes(recipe.prepTime) + durationMinutes(recipe.cookTime);
  const metadata = unique([text(recipe.recipeYield), displayDuration(totalMinutes)]).join(' · ');
  const nutrition: string[] = [];
  if (record(recipe.nutrition)) {
    const labels: Record<string, string> = { calories: 'Calories', proteinContent: 'Protein', carbohydrateContent: 'Carbohydrates', fatContent: 'Fat', fiberContent: 'Fiber', sodiumContent: 'Sodium' };
    for (const [key, label] of Object.entries(labels)) {
      const value = text(recipe.nutrition[key]);
      if (value) nutrition.push(`${label}: ${value}`);
    }
  }
  const keywords = Array.isArray(recipe.keywords) ? recipe.keywords.map(text) : text(recipe.keywords).split(',').map((part) => part.trim());
  return {
    title,
    imageUrl: imageUrl(recipe.image),
    sourceLabel: sourceName(recipe, url),
    sourceUrl,
    metadata,
    ingredients: list(recipe.recipeIngredient).map(text).filter(Boolean),
    directions: instructionLines(recipe.recipeInstructions),
    notes: [],
    nutrition,
    tags: unique([...list(recipe.recipeCategory).map(text), ...list(recipe.recipeCuisine).map(text), ...keywords]),
    favorite: false,
  };
}

function decodeEntities(value: string): string {
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function plainHtml(value: string): string {
  return decodeEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function classBlock(html: string, className: string): string {
  const start = new RegExp(`<([a-z0-9]+)\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'i').exec(html);
  if (!start) return '';
  const tag = start[1];
  const token = new RegExp(`<${tag}\\b[^>]*>|<\/${tag}>`, 'gi');
  token.lastIndex = start.index;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html))) {
    depth += match[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(start.index + start[0].length, match.index);
  }
  return '';
}

function attribute(tag: string, name: string): string {
  return new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(tag)?.[1] ?? '';
}

function microdataItems(block: string, itemprop: string): string[] {
  const result: string[] = [];
  const pattern = new RegExp(`<([a-z0-9]+)\\b[^>]*itemprop=["']${itemprop}["'][^>]*>([\\s\\S]*?)<\/\\1>`, 'gi');
  for (const match of block.matchAll(pattern)) {
    const value = plainHtml(match[2]);
    if (value) result.push(value);
  }
  return result;
}

function fromElaraCard(html: string, sourceUrl: string): ImportedRecipeDraft | undefined {
  const pair = /<div\b(?=[^>]*\bid=["']elara-recipe["'])[^>]*>\s*<\/div>\s*(<div\b(?=[^>]*\bclass=["'][^"']*\blt-recipe\b[^"']*["'])(?=[^>]*\bid=["']lt-recipe["'])(?=[^>]*\bitemtype=["']https?:\/\/schema\.org\/Recipe["'])[^>]*>)/i.exec(html);
  if (!pair) return undefined;
  const subtree = html.slice(pair.index + pair[0].lastIndexOf(pair[1]));
  const card = classBlock(subtree, 'lt-recipe');
  if (!card) return undefined;
  const title = microdataItems(card, 'name')[0] ?? '';
  if (!title) return undefined;
  const imageTag = /<img\b[^>]*itemprop=["']image["'][^>]*>/i.exec(card)?.[0] ?? '';
  const image = attribute(imageTag, 'src');
  const url = new URL(sourceUrl);
  const siteName = /<meta\b[^>]*(?:property|name)=["']og:site_name["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1];
  const author = microdataItems(card, 'author')[0];
  const brand = author || (siteName ? decodeEntities(siteName) : url.hostname.replace(/^www\./, '').split('.')[0].replace(/(^|[-_])\w/g, (part) => part.replace(/[-_]/, ' ').toUpperCase()));
  const servings = plainHtml(classBlock(card, 'recipe-servings'));
  const ingredients = microdataItems(classBlock(card, 'recipe-ingredients'), 'recipeIngredient');
  const directionsBlock = classBlock(card, 'recipe-directions');
  const directions: string[] = [];
  for (const match of directionsBlock.matchAll(/<(dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const value = plainHtml(match[2]);
    if (value) directions.push(value);
  }
  return { title, imageUrl: image ? new URL(image, url).href : '', sourceLabel: brand, sourceUrl, metadata: servings, ingredients, directions, notes: [], nutrition: [], tags: [], favorite: false };
}

function richTextSections(block: string): string[] {
  const values: string[] = [];
  for (const match of block.matchAll(/<p\b[^>]*>[\s\S]*?<strong\b[^>]*>([\s\S]*?)<\/strong>[\s\S]*?<\/p>|<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const heading = plainHtml(match[1] || '').replace(/:\s*$/, '').trim();
    const item = plainHtml(match[2] || '');
    if (heading && !/^\W*notes?\b/i.test(heading)) values.push(heading);
    else if (item) values.push(item);
  }
  return values;
}

function mergeJoshuaHtml(draft: ImportedRecipeDraft, html: string, sourceUrl: string): ImportedRecipeDraft {
  const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
  if (hostname !== 'joshuaweissman.com') return draft;
  const ingredients = richTextSections(classBlock(html, 'ingredients-list'));
  const directions = richTextSections(classBlock(html, 'directions-list'));
  return {
    ...draft,
    ingredients: draft.ingredients.length ? draft.ingredients : ingredients,
    directions: draft.directions.length ? draft.directions : directions,
  };
}

export function parseRecipeHtml(html: string, sourceUrl: string): ImportedRecipeDraft {
  let partialDraft: ImportedRecipeDraft | undefined;
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      for (const recipe of findRecipes(JSON.parse(match[1]))) {
        const draft = fromJsonLd(recipe, sourceUrl);
        if (!draft) continue;
        const merged = mergeJoshuaHtml(draft, html, sourceUrl);
        if (merged.ingredients.length || merged.directions.length) return merged;
        partialDraft ??= merged;
      }
    } catch { /* Ignore malformed structured-data blocks and inspect the others. */ }
  }
  if (partialDraft) return partialDraft;
  const fallback = fromElaraCard(html, sourceUrl);
  if (fallback) return fallback;
  throw new RecipeParseError('No usable recipe was found on the page.');
}

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const root = process.cwd();
const recipesDir = join(root, 'Recipes');
const outPath = join(root, 'src/data/seedRecipes.ts');
const now = '2026-05-14T00:00:00.000Z';

const sectionNames = new Set(['Ingredients', 'Directions', 'Notes', 'Nutrition']);

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function cleanInline(value) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function inferTags(title, ingredients) {
  const haystack = `${title} ${ingredients.join(' ')}`.toLowerCase();
  const rules = [
    ['breakfast', /pancake|smoothie|cinnamon|bagel|breakfast|banana/],
    ['bread', /bread|dough|bun|baguette|ciabatta|babka|loaf|bagel/],
    ['pizza', /pizza|calzone/],
    ['dessert', /cake|brownie|cookie|snickerdoodle|tres leches|cinnamon roll/],
    ['chicken', /chicken/],
    ['sandwich', /sandwich|burger|gyro|hot dog|corn dog/],
    ['quick', /smoothie|pancake|burrito/]
  ];
  const tags = new Set();
  for (const [tag, pattern] of rules) {
    if (pattern.test(haystack)) tags.add(tag);
  }
  if (!tags.size) tags.add('household');
  return [...tags].sort();
}

function parseMarkdown(markdown, fallbackId) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const titleLine = lines.find((line) => line.trim().startsWith('# '));
  const title = cleanInline(titleLine?.replace(/^#\s+/, '') || fallbackId);
  const sections = {
    Ingredients: [],
    Directions: [],
    Notes: [],
    Nutrition: []
  };
  let sourceLabel = '';
  let sourceUrl = '';
  const metadata = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('# ')) continue;

    const section = line.match(/^##\s+(.+?)\s*$/)?.[1];
    if (section && sectionNames.has(section)) {
      current = section;
      continue;
    }

    if (!current && line.startsWith('Source:')) {
      const source = line.replace(/^Source:\s*/, '');
      const match = source.match(/^\[(.+?)\]\((.+?)\)$/);
      sourceLabel = cleanInline(match?.[1] || source);
      sourceUrl = match?.[2]?.trim() || (source.startsWith('http') ? source : '');
      continue;
    }

    if (!current) {
      metadata.push(cleanInline(line));
      continue;
    }

    const item = cleanInline(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
    if (item) sections[current].push(item);
  }

  return {
    id: slugify(title),
    title,
    sourceLabel,
    sourceUrl,
    metadata: metadata.join(' ').trim(),
    ingredients: sections.Ingredients,
    directions: sections.Directions,
    notes: sections.Notes,
    nutrition: sections.Nutrition,
    tags: inferTags(title, sections.Ingredients),
    favorite: false,
    createdAt: now,
    updatedAt: now
  };
}

const files = (await readdir(recipesDir)).filter((file) => file.endsWith('.md')).sort();
const recipes = [];

for (const file of files) {
  const markdown = await readFile(join(recipesDir, file), 'utf8');
  recipes.push(parseMarkdown(markdown, slugify(basename(file, '.md'))));
}

const source = `import type { Recipe } from '../lib/types';\n\nexport const seedRecipes: Recipe[] = ${JSON.stringify(recipes, null, 2)};\n`;
await writeFile(outPath, source, 'utf8');
console.log(`Wrote ${recipes.length} seed recipes to ${outPath}`);

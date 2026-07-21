import type { Recipe } from './types';

const SECTION_NAMES = ['Ingredients', 'Directions', 'Notes', 'Nutrition'] as const;
type SectionName = (typeof SECTION_NAMES)[number];

const sectionPattern = /^##\s+(.+?)\s*$/;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function parseRecipeMarkdown(markdown: string, fallbackId?: string): Recipe {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const titleLine = lines.find((line) => line.trim().startsWith('# '));
  const title = cleanInline(titleLine?.replace(/^#\s+/, '') || fallbackId || 'Untitled Recipe');
  const now = new Date('2026-05-14T00:00:00.000Z').toISOString();
  const sections = new Map<SectionName, string[]>(
    SECTION_NAMES.map((section) => [section, []])
  );

  let sourceLabel = '';
  let sourceUrl = '';
  const metadata: string[] = [];
  let current: SectionName | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('# ')) {
      continue;
    }

    const section = line.match(sectionPattern)?.[1];
    if (section && isSectionName(section)) {
      current = section;
      continue;
    }

    if (!current && line.startsWith('Source:')) {
      const source = line.replace(/^Source:\s*/, '');
      const match = source.match(/^\[(.+?)\]\((.+?)\)$/);
      if (match) {
        sourceLabel = cleanInline(match[1]);
        sourceUrl = match[2].trim();
      } else {
        sourceLabel = cleanInline(source);
        sourceUrl = source.startsWith('http') ? source : '';
      }
      continue;
    }

    if (!current) {
      metadata.push(cleanInline(line));
      continue;
    }

    const item = cleanListItem(line);
    if (item) {
      sections.get(current)?.push(item);
    }
  }

  return {
    id: fallbackId || slugify(title),
    title,
    imageUrl: '',
    sourceLabel,
    sourceUrl,
    metadata: metadata.join(' ').trim(),
    ingredients: sections.get('Ingredients') ?? [],
    directions: sections.get('Directions') ?? [],
    notes: sections.get('Notes') ?? [],
    nutrition: sections.get('Nutrition') ?? [],
    tags: inferTags(title, sections.get('Ingredients') ?? []),
    favorite: false,
    createdAt: now,
    updatedAt: now
  };
}

export function exportRecipesAsMarkdown(recipes: Recipe[]): string {
  return recipes
    .map((recipe) => {
      const lines = [`# ${recipe.title}`, ''];
      if (recipe.sourceUrl) {
        lines.push(`Source: [${recipe.sourceLabel || recipe.sourceUrl}](${recipe.sourceUrl})`, '');
      }
      if (recipe.metadata) {
        lines.push(recipe.metadata, '');
      }
      appendSection(lines, 'Ingredients', recipe.ingredients, '-');
      appendSection(lines, 'Directions', recipe.directions, '1.');
      appendSection(lines, 'Notes', recipe.notes, '-');
      appendSection(lines, 'Nutrition', recipe.nutrition, '-');
      return lines.join('\n').trim();
    })
    .join('\n\n---\n\n');
}

function appendSection(lines: string[], title: SectionName, values: string[], marker: '-' | '1.'): void {
  if (!values.length) {
    return;
  }

  lines.push(`## ${title}`, '');
  values.forEach((value, index) => {
    lines.push(marker === '1.' ? `${index + 1}. ${value}` : `- ${value}`);
  });
  lines.push('');
}

function isSectionName(value: string): value is SectionName {
  return SECTION_NAMES.includes(value as SectionName);
}

function cleanListItem(line: string): string {
  const withoutMarker = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
  return cleanInline(withoutMarker);
}

function cleanInline(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function inferTags(title: string, ingredients: string[]): string[] {
  const haystack = `${title} ${ingredients.join(' ')}`.toLowerCase();
  const tags = new Set<string>();

  const rules: Array<[string, RegExp]> = [
    ['breakfast', /pancake|smoothie|cinnamon|bagel|breakfast|banana/],
    ['bread', /bread|dough|bun|baguette|ciabatta|babka|loaf|bagel/],
    ['pizza', /pizza|calzone/],
    ['dessert', /cake|brownie|cookie|snickerdoodle|tres leches|cinnamon roll/],
    ['chicken', /chicken/],
    ['sandwich', /sandwich|burger|gyro|hot dog|corn dog/],
    ['quick', /smoothie|pancake|burrito/]
  ];

  for (const [tag, pattern] of rules) {
    if (pattern.test(haystack)) {
      tags.add(tag);
    }
  }

  if (!tags.size) {
    tags.add('household');
  }

  return [...tags].sort();
}

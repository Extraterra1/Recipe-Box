import type { Recipe, RecipeFilters } from './types';

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const query = normalize(filters.query);
  const activeTags = new Set(filters.tags.map(normalize));

  return recipes.filter((recipe) => {
    if (filters.favoritesOnly && !recipe.favorite) {
      return false;
    }

    if (activeTags.size && !recipe.tags.some((tag) => activeTags.has(normalize(tag)))) {
      return false;
    }

    if (!query) {
      return true;
    }

    return searchableText(recipe).includes(query);
  });
}

export function getAllTags(recipes: Recipe[]): string[] {
  return [...new Set(recipes.flatMap((recipe) => recipe.tags))].sort((a, b) => a.localeCompare(b));
}

export function getRecipeSummary(recipe: Recipe): string {
  const count = recipe.ingredients.length;
  const directionCount = recipe.directions.length;
  return `${count} ingredient${count === 1 ? '' : 's'} · ${directionCount} step${directionCount === 1 ? '' : 's'}`;
}

function searchableText(recipe: Recipe): string {
  return normalize(
    [
      recipe.title,
      recipe.sourceLabel,
      recipe.sourceUrl,
      recipe.metadata,
      recipe.ingredients.join(' '),
      recipe.directions.join(' '),
      recipe.notes.join(' '),
      recipe.tags.join(' ')
    ].join(' ')
  );
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

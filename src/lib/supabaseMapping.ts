import type { Recipe } from './types';

export type RecipeRow = {
  id: string;
  cookbook_id: string;
  title: string;
  source_label: string | null;
  source_url: string | null;
  metadata: string | null;
  ingredients: string[];
  directions: string[];
  notes: string[];
  nutrition: string[];
  tags: string[];
  favorite: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeInsert = Omit<RecipeRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export function toRecipeInsert(recipe: Recipe, cookbookId: string): RecipeInsert {
  return {
    cookbook_id: cookbookId,
    title: recipe.title,
    image_url: recipe.imageUrl || null,
    source_label: recipe.sourceLabel || null,
    source_url: recipe.sourceUrl || null,
    metadata: recipe.metadata || null,
    ingredients: recipe.ingredients,
    directions: recipe.directions,
    notes: recipe.notes,
    nutrition: recipe.nutrition,
    tags: recipe.tags,
    favorite: recipe.favorite,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt
  };
}

export function fromRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    cookbookId: row.cookbook_id,
    title: row.title,
    imageUrl: row.image_url ?? '',
    sourceLabel: row.source_label ?? '',
    sourceUrl: row.source_url ?? '',
    metadata: row.metadata ?? '',
    ingredients: row.ingredients ?? [],
    directions: row.directions ?? [],
    notes: row.notes ?? [],
    nutrition: row.nutrition ?? [],
    tags: row.tags ?? [],
    favorite: row.favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

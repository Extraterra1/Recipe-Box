import { exportRecipesAsMarkdown } from './markdown';
import type { Recipe } from './types';

export function downloadRecipes(recipes: Recipe[], format: 'markdown' | 'json'): void {
  const body = format === 'markdown' ? exportRecipesAsMarkdown(recipes) : JSON.stringify(recipes, null, 2);
  const type = format === 'markdown' ? 'text/markdown' : 'application/json';
  const extension = format === 'markdown' ? 'md' : 'json';
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `recipe-box-export.${extension}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

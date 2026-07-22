import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App, { RecipeList, RecipeThumbnail, sortRecipes } from './App';
import { seedRecipes } from './data/seedRecipes';
import type { Recipe } from './lib/types';

const recipeImportMocks = vi.hoisted(() => ({
  getAvailability: vi.fn<() => import('./lib/recipeImport').RecipeImportAvailability>(() => ({ available: true })),
  importRecipe: vi.fn()
}));

vi.mock('./lib/recipeImport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/recipeImport')>();
  return {
    ...actual,
    getRecipeImportAvailability: recipeImportMocks.getAvailability,
    importRecipeFromUrl: recipeImportMocks.importRecipe
  };
});

async function openManualEditor(trigger: HTMLElement) {
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('button', { name: 'Create manually' }));
}

const imageRecipe: Recipe = {
  id: 'photo-recipe',
  title: 'Photo Recipe',
  imageUrl: 'https://example.com/recipe.jpg',
  sourceLabel: '',
  sourceUrl: '',
  metadata: '',
  ingredients: [],
  directions: [],
  notes: [],
  nutrition: [],
  tags: [],
  favorite: false,
  createdAt: '',
  updatedAt: ''
};

describe('Recipe Box app shell', () => {
  beforeEach(() => {
    recipeImportMocks.getAvailability.mockReturnValue({ available: true });
    recipeImportMocks.importRecipe.mockReset();
  });

  it('offers manual creation and URL import from the shared add menu', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));

    const menu = screen.getByRole('dialog', { name: 'Add recipe' });
    expect(within(menu).getByRole('button', { name: 'Create manually' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Import from URL' })).toBeInTheDocument();

    await userEvent.click(within(menu).getByRole('button', { name: 'Create manually' }));
    expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();
  });

  it('opens a paste-friendly URL import form and validates before importing', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));

    const input = screen.getByRole('textbox', { name: 'Recipe URL' });
    expect(input).toHaveAttribute('inputmode', 'url');
    expect(input).toHaveAttribute('autocomplete', 'url');
    await userEvent.type(input, 'not a URL');
    await userEvent.click(screen.getByRole('button', { name: 'Import recipe' }));

    expect(await screen.findByText('Enter a valid recipe link.')).toBeInTheDocument();
    expect(recipeImportMocks.importRecipe).not.toHaveBeenCalled();
    expect(input).toHaveValue('not a URL');
  });

  it('shows progress then opens an unsaved imported recipe in the editor', async () => {
    let resolveImport!: (value: import('./lib/types').RecipeDraft) => void;
    recipeImportMocks.importRecipe.mockReturnValue(new Promise((resolve) => { resolveImport = resolve; }));
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));
    const input = screen.getByRole('textbox', { name: 'Recipe URL' });
    await userEvent.type(input, 'https://example.com/garlic-rolls');
    await userEvent.click(screen.getByRole('button', { name: 'Import recipe' }));

    expect(screen.getByRole('button', { name: 'Importing recipe' })).toBeDisabled();
    expect(input).toBeDisabled();
    resolveImport({
      title: 'Cheesy Garlic Rolls', imageUrl: '', sourceLabel: 'Sage Bakes',
      sourceUrl: 'https://example.com/garlic-rolls', metadata: '12 rolls',
      ingredients: ['2 cups flour'], directions: ['Mix the dough.'], notes: [], nutrition: [], tags: [], favorite: false
    });

    expect(await screen.findByRole('heading', { name: 'Edit Cheesy Garlic Rolls' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Cheesy Garlic Rolls');
    expect(screen.getByRole('textbox', { name: 'Ingredients' })).toHaveValue('2 cups flour');
  });

  it('keeps the URL import surface locked while an import is pending', async () => {
    let resolveImport!: (value: import('./lib/types').RecipeDraft) => void;
    recipeImportMocks.importRecipe.mockReturnValue(new Promise((resolve) => { resolveImport = resolve; }));
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Recipe URL' }), 'https://example.com/pending');
    await userEvent.click(screen.getByRole('button', { name: 'Import recipe' }));

    const back = screen.getByRole('button', { name: 'Back to add options' });
    expect(back).toBeDisabled();
    await userEvent.click(back);
    expect(screen.getByRole('dialog', { name: 'Import from URL' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create manually' })).not.toBeInTheDocument();

    resolveImport({
      title: 'Pending Import', imageUrl: '', sourceLabel: '', sourceUrl: 'https://example.com/pending',
      metadata: '', ingredients: [], directions: [], notes: [], nutrition: [], tags: [], favorite: false
    });
    expect(await screen.findByRole('heading', { name: 'Edit Pending Import' })).toBeInTheDocument();
  });

  it('focuses each add surface and traps keyboard focus inside the dialog', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    expect(screen.getByRole('button', { name: 'Create manually' })).toHaveFocus();

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close add recipe menu' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));
    expect(screen.getByRole('textbox', { name: 'Recipe URL' })).toHaveFocus();
    screen.getByRole('button', { name: 'Import recipe' }).focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Back to add options' })).toHaveFocus();
  });

  it('closes the add dialog with Escape and restores focus to its trigger', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    const trigger = screen.getByRole('button', { name: 'Add recipe' });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Add recipe' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('announces pending imports and ignores Escape until the request settles', async () => {
    let resolveImport!: (value: import('./lib/types').RecipeDraft) => void;
    recipeImportMocks.importRecipe.mockReturnValue(new Promise((resolve) => { resolveImport = resolve; }));
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Recipe URL' }), 'https://example.com/pending');
    await userEvent.click(screen.getByRole('button', { name: 'Import recipe' }));

    const dialog = screen.getByRole('dialog', { name: 'Import from URL' });
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Importing recipe');
    await userEvent.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();

    resolveImport({
      title: 'Settled Import', imageUrl: '', sourceLabel: '', sourceUrl: 'https://example.com/pending',
      metadata: '', ingredients: [], directions: [], notes: [], nutrition: [], tags: [], favorite: false
    });
    expect(await screen.findByRole('heading', { name: 'Edit Settled Import' })).toBeInTheDocument();
  });

  it('keeps Tab and Shift+Tab on the dialog when a pending import disables every control', async () => {
    recipeImportMocks.importRecipe.mockReturnValue(new Promise(() => {}));
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Recipe URL' }), 'https://example.com/pending');
    await userEvent.click(screen.getByRole('button', { name: 'Import recipe' }));

    const dialog = screen.getByRole('dialog', { name: 'Import from URL' });
    expect(dialog).toHaveFocus();
    await userEvent.tab();
    expect(dialog).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(dialog).toHaveFocus();
  });

  it('retains the URL and shows the import error when an import fails', async () => {
    recipeImportMocks.importRecipe.mockRejectedValue(new Error('The recipe page could not be reached. Try again.'));
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));
    const input = screen.getByRole('textbox', { name: 'Recipe URL' });
    await userEvent.type(input, 'https://example.com/broken');
    await userEvent.click(screen.getByRole('button', { name: 'Import recipe' }));

    expect(await screen.findByText('The recipe page could not be reached. Try again.')).toBeInTheDocument();
    expect(input).toHaveValue('https://example.com/broken');
    expect(input).not.toBeDisabled();
  });

  it('cancels an imported draft without adding it to the collection', async () => {
    recipeImportMocks.importRecipe.mockResolvedValue({
      title: 'Unsaved Import', imageUrl: '', sourceLabel: '', sourceUrl: 'https://example.com/import',
      metadata: '', ingredients: [], directions: [], notes: [], nutrition: [], tags: [], favorite: false
    });
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    const initialCount = within(list).getAllByRole('button').length;
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Import from URL' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Recipe URL' }), 'https://example.com/import');
    await userEvent.click(screen.getByRole('button', { name: 'Import recipe' }));
    await screen.findByRole('heading', { name: 'Edit Unsaved Import' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Unsaved Import')).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Recipes' })).getAllByRole('button')).toHaveLength(initialCount);
  });

  it('explains when URL import is unavailable', async () => {
    recipeImportMocks.getAvailability.mockReturnValue({ available: false, reason: 'Connect to the internet to import a recipe.' });
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
    const importButton = screen.getByRole('button', { name: 'Import from URL' });
    expect(importButton).toBeDisabled();
    expect(screen.getByText('Connect to the internet to import a recipe.')).toBeInTheDocument();
  });
  it('shows stable navigation counts and preview skeletons during bootstrap', () => {
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Library navigation' });
    expect(within(navigation).queryByText(/^0$/)).not.toBeInTheDocument();
    expect(within(navigation).getAllByTestId('navigation-count-skeleton')).toHaveLength(2);
    const preview = screen.getByRole('region', { name: 'Recipe preview' });
    expect(preview).toHaveAttribute('aria-busy', 'true');
    expect(within(preview).getByTestId('recipe-preview-skeleton')).toBeInTheDocument();
  });
  it('exposes library, index, and preview as persistent desktop workspace regions', async () => {
    const { container } = render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    expect(screen.getByRole('navigation', { name: 'Library navigation' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recipe index' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recipe preview' })).toBeInTheDocument();
    expect(container.querySelector('.desktop-workspace')).toHaveAttribute('data-mobile-view', 'collection');
  });

  it('shows a result count and sorts recipes without mutating the source list', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    expect(screen.getByText(/\d+ recipes$/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort recipes' })).toHaveValue('alphabetical');
    expect(within(list).getAllByRole('button')[0]).toHaveAccessibleName(/Open 2 Dollar Burrito/i);

    const source = [
      { ...imageRecipe, id: 'older', title: 'Alpha', updatedAt: '2025-01-01T00:00:00.000Z' },
      { ...imageRecipe, id: 'newer', title: 'Zulu', updatedAt: '2026-01-01T00:00:00.000Z' }
    ];
    expect(sortRecipes(source, 'recent').map((recipe) => recipe.title)).toEqual(['Zulu', 'Alpha']);
    expect(source.map((recipe) => recipe.title)).toEqual(['Alpha', 'Zulu']);
  });

  it('sorts recent recipes deterministically when dates tie or are invalid', () => {
    const recipes = [
      { ...imageRecipe, id: 'invalid-zulu', title: 'Zulu invalid', updatedAt: 'not-a-date' },
      { ...imageRecipe, id: 'valid-zulu', title: 'Zulu valid', updatedAt: '2026-02-01T00:00:00.000Z' },
      { ...imageRecipe, id: 'missing-alpha', title: 'Alpha missing', updatedAt: '' },
      { ...imageRecipe, id: 'valid-alpha', title: 'Alpha valid', updatedAt: '2026-02-01T00:00:00.000Z' }
    ];

    expect(sortRecipes(recipes, 'recent').map((recipe) => recipe.id)).toEqual([
      'valid-alpha',
      'valid-zulu',
      'missing-alpha',
      'invalid-zulu'
    ]);
  });

  it('renders desktop source and modified metadata in each recipe row', () => {
    render(
      <RecipeList
        listRef={createRef<HTMLUListElement>()}
        recipes={[{ ...imageRecipe, sourceLabel: 'Family notebook', updatedAt: '2026-05-14T00:00:00.000Z' }]}
        totalRecipeCount={1}
        isLoading={false}
        onCreate={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    const row = screen.getByRole('button', { name: /Open Photo Recipe/i });
    expect(within(row).getByText('Family notebook')).toBeInTheDocument();
    expect(within(row).getByText(/Modified May 14, 2026/i)).toBeInTheDocument();
    expect(within(row).getByText('Family notebook').closest('.recipe-row-metadata')).toHaveClass('desktop-only');
  });

  it('updates the read-only preview while keeping navigation and index mounted', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    const index = screen.getByRole('region', { name: 'Recipe index' });
    await userEvent.click(within(index).getByRole('button', { name: /Open Baguette/i }));

    const preview = screen.getByRole('region', { name: 'Recipe preview' });
    expect(within(preview).getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Library navigation' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recipe index' })).toBeInTheDocument();
  });

  it('keeps collection as the origin when favoriting or editing its desktop preview', async () => {
    const { container } = render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));
    await waitFor(() => {
      expect(container.querySelector('.desktop-workspace')).toHaveAttribute('data-mobile-view', 'collection');
    });
    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Browse favorites, 0 recipes/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(container.querySelector('.desktop-workspace')).toHaveAttribute('data-mobile-view', 'editor');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(container.querySelector('.desktop-workspace')).toHaveAttribute('data-mobile-view', 'collection');
  });

  it('returns a saved collection-preview edit to collection with the saved data visible', async () => {
    const { container } = render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const title = screen.getByRole('textbox', { name: 'Title' });
    await userEvent.clear(title);
    await userEvent.type(title, '2 Dollar Burrito Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() => {
      expect(container.querySelector('.desktop-workspace')).toHaveAttribute('data-mobile-view', 'collection');
    });
    expect(screen.getByRole('heading', { name: '2 Dollar Burrito Updated' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Title' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), '2 Dollar Burrito but Cheaper');
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));
    await screen.findByRole('heading', { name: '2 Dollar Burrito but Cheaper' });
  });

  it('returns a saved detail-origin edit to detail', async () => {
    const { container } = render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() => {
      expect(container.querySelector('.desktop-workspace')).toHaveAttribute('data-mobile-view', 'detail');
    });
    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
  });

  it('replaces preview with editor or settings while navigation and index remain co-mounted', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    const index = screen.getByRole('region', { name: 'Recipe index' });
    await userEvent.click(within(index).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('navigation', { name: 'Library navigation' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recipe index' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recipe preview' })).toHaveAttribute('data-pane-content', 'editor');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    expect(screen.getByRole('region', { name: 'Recipe index' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recipe preview' })).toHaveAttribute('data-pane-content', 'settings');
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipe' }));
    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
  });

  it('returns an active editor to the same preview on Escape with navigation and index mounted', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Library navigation' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recipe index' })).toBeInTheDocument();
  });

  it('does not let Escape cancel an editor hidden behind settings', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Hidden draft');
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('region', { name: /Recipe Box$/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to editor' }));
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Hidden draft');
  });

  it('reconciles detail selection and preview when search excludes the selected recipe', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'pizza');

    await waitFor(() => {
      expect(within(list).getByRole('button', { name: /Open Delivery Pizza/i })).toHaveClass('selected');
    });
    expect(screen.getByRole('heading', { name: 'Delivery Pizza' })).toBeInTheDocument();
  });

  it('shows an empty preview when search has no results', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'no recipe has this title');

    expect(await screen.findByRole('heading', { name: 'No recipe selected' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2 Dollar Burrito but Cheaper' })).not.toBeInTheDocument();
  });

  it('shows an empty favorites index and preview after unfavoriting the last favorite', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));
    const navigation = screen.getByRole('navigation', { name: 'Library navigation' });
    await waitFor(() => expect(within(navigation).getByRole('button', { name: /Browse favorites, 1 recipes/i })).toBeInTheDocument());
    await userEvent.click(within(navigation).getByRole('button', { name: /Browse favorites/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));

    expect(await screen.findByText('No recipes match your search or filters.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No recipe selected' })).toBeInTheDocument();
  });
  it('provides persistent library navigation with recipe, favorite, tag, and management destinations', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    const navigation = screen.getByRole('navigation', { name: 'Library navigation' });

    expect(within(navigation).getByRole('button', { name: /Recipe Box home/i })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: /All Recipes, \d+ recipes/i })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: /Browse favorites, \d+ recipes/i })).toBeInTheDocument();
    expect(within(navigation).getByRole('group', { name: 'Recipe tags' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Create Recipe' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Import/Export' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('filters the recipe index from library navigation and All Recipes clears filters without clearing search', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    const navigation = screen.getByRole('navigation', { name: 'Library navigation' });
    const search = screen.getByRole('searchbox', { name: 'Search recipes' });
    await userEvent.type(search, 'pizza');

    await userEvent.click(within(navigation).getByRole('button', { name: /tag pizza/i }));
    expect(within(list).getByText('NYC Pizza')).toBeInTheDocument();
    expect(search).toHaveValue('pizza');

    await userEvent.click(within(navigation).getByRole('button', { name: /Browse favorites/i }));
    expect(search).toHaveValue('pizza');

    await userEvent.click(within(navigation).getByRole('button', { name: /All Recipes/i }));
    expect(search).toHaveValue('pizza');
    expect(within(navigation).getByRole('button', { name: /Browse favorites/i })).toHaveAttribute('aria-pressed', 'false');
    expect(within(navigation).getByRole('button', { name: /tag pizza/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows only favorited recipes in the central index from Favorites navigation', async () => {
    render(<App />);

    const initialList = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(initialList).getByRole('button', { name: /Open NYC Pizza/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));

    const navigation = screen.getByRole('navigation', { name: 'Library navigation' });
    await waitFor(() => {
      expect(within(navigation).getByRole('button', { name: /Browse favorites, 1 recipes/i })).toBeInTheDocument();
    });
    await userEvent.click(within(navigation).getByRole('button', { name: /Browse favorites/i }));

    const favoritesList = await screen.findByRole('list', { name: 'Recipes' });
    expect(within(favoritesList).getByText('NYC Pizza')).toBeInTheDocument();
    expect(within(favoritesList).queryByText('Baguette')).not.toBeInTheDocument();

    await userEvent.click(within(favoritesList).getByRole('button', { name: /Open NYC Pizza/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Favorite' }));
    await waitFor(() => {
      expect(within(navigation).getByRole('button', { name: /Browse favorites, 0 recipes/i })).toBeInTheDocument();
    });
  });

  it('opens create, settings, and existing data management from library navigation', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    scrollIntoView.mockClear();
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    const navigation = screen.getByRole('navigation', { name: 'Library navigation' });

    await userEvent.click(within(navigation).getByRole('button', { name: 'Import/Export' }));
    const dataManagement = screen.getByRole('region', { name: 'Data management' });
    await waitFor(() => {
      expect(scrollIntoView.mock.instances[scrollIntoView.mock.instances.length - 1]).toBe(dataManagement);
    });

    await userEvent.click(within(navigation).getByRole('button', { name: 'Settings' }));
    const settings = screen.getByRole('region', { name: /Recipe Box$/ });
    await waitFor(() => {
      expect(scrollIntoView.mock.instances[scrollIntoView.mock.instances.length - 1]).toBe(settings);
    });

    await openManualEditor(within(navigation).getByRole('button', { name: 'Create Recipe' }));
    expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();
  });

  it('shows stable recipe-row skeletons while the collection is loading', () => {
    render(
      <RecipeList
        listRef={createRef<HTMLUListElement>()}
        recipes={[]}
        totalRecipeCount={0}
        isLoading
        onCreate={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    const list = screen.getByRole('list', { name: 'Loading recipes' });
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(within(list).getAllByTestId('recipe-row-skeleton')).toHaveLength(3);
    expect(screen.queryByText(/No recipes match/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No recipes saved/i)).not.toBeInTheDocument();
  });

  it('offers a direct create action for a genuinely empty loaded collection', async () => {
    const onCreate = vi.fn();
    render(
      <RecipeList
        listRef={createRef<HTMLUListElement>()}
        recipes={[]}
        totalRecipeCount={0}
        isLoading={false}
        onCreate={onCreate}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('No recipes saved yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create recipe' }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('shows concise no-results copy when filters hide a nonempty collection', () => {
    render(
      <RecipeList
        listRef={createRef<HTMLUListElement>()}
        recipes={[]}
        totalRecipeCount={1}
        isLoading={false}
        onCreate={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('No recipes match your search or filters.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create recipe' })).not.toBeInTheDocument();
  });

  it('shows identity, search, and an alphabetical title-led recipe list', async () => {
    render(<App />);

    const heading = await screen.findByRole('heading', { name: 'Recipe Box' });
    const search = screen.getByRole('searchbox', { name: 'Search recipes' });
    const list = await screen.findByRole('list', { name: 'Recipes' });
    expect(screen.queryByRole('link', { name: 'Skip to recipe' })).not.toBeInTheDocument();

    expect(heading.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const rows = within(list).getAllByRole('button');
    expect(rows[0]).toHaveAccessibleName(/Open 2 Dollar Burrito but Cheaper/i);

    const baguette = within(list).getByRole('button', { name: /Open Baguette/i });
    expect(within(baguette).getByText('Baguette')).toBeInTheDocument();
    expect(within(baguette).getByTestId('recipe-thumbnail-placeholder')).toBeInTheDocument();
    expect(within(list).queryByText(/Servings:/i)).not.toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: /favorite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Recipe filters/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
  });

  it('uses the full brand lockup to return from detail to the recipe index with collection context intact', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    list.scrollTop = 420;
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'pizza');
    await userEvent.click(within(list).getByRole('button', { name: /Open NYC Pizza/i }));

    await userEvent.click(screen.getByRole('link', { name: 'Recipe Box home' }));

    expect(screen.getByRole('list', { name: 'Recipes' })).toHaveProperty('scrollTop', 420);
    expect(screen.getByRole('searchbox', { name: 'Search recipes' })).toHaveValue('pizza');
  });

  it('uses the brand lockup to return from the editor to the recipe index', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    list.scrollTop = 360;
    await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
    expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Recipe Box home' }));

    expect(screen.getByRole('list', { name: 'Recipes' })).toHaveProperty('scrollTop', 360);
  });

  it('uses the brand lockup to return from settings to the recipe index', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    list.scrollTop = 280;
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    expect(screen.getByRole('region', { name: /Recipe Box/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Recipe Box home' }));

    expect(screen.getByRole('list', { name: 'Recipes' })).toHaveProperty('scrollTop', 280);
  });

  it('opens the create editor from mobile collection and detail views when randomUUID is unavailable', async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', { ...originalCrypto, randomUUID: undefined });

    try {
      render(<App />);

      await screen.findByRole('list', { name: 'Recipes' });
      await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
      expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      const returnedList = screen.getByRole('list', { name: 'Recipes' });
      await userEvent.click(within(returnedList).getByRole('button', { name: /Open Baguette/i }));
      await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
      expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses a decorative lazy-loaded image when a recipe has a thumbnail URL', () => {
    render(<RecipeThumbnail recipe={imageRecipe} />);

    const image = screen.getByRole('presentation');
    expect(image).toHaveAttribute('src', imageRecipe.imageUrl);
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(screen.queryByTestId('recipe-thumbnail-placeholder')).not.toBeInTheDocument();
  });

  it('falls back to the stable placeholder when a thumbnail fails to load', () => {
    const { rerender } = render(<RecipeThumbnail recipe={imageRecipe} />);

    fireEvent.error(screen.getByRole('presentation'));
    expect(screen.getByTestId('recipe-thumbnail-placeholder')).toBeInTheDocument();

    rerender(
      <RecipeThumbnail
        recipe={{ ...imageRecipe, imageUrl: 'https://example.com/replacement.jpg' }}
      />
    );
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'https://example.com/replacement.jpg'
    );
  });

  it('keeps utility actions quiet in the header and recipe filters available in settings', async () => {
    render(<App />);

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('button', { name: 'Add recipe' })).toBeInTheDocument();
    const settingsButton = within(header).getByRole('button', { name: 'Open household settings' });
    expect(within(header).queryByText(/Offline ready/i)).not.toBeInTheDocument();
    expect(within(header).queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(settingsButton);

    const settings = screen.getByRole('region', { name: /Recipe Box/i });
    expect(await within(settings).findByText(/Offline ready/i)).toBeInTheDocument();
    expect(within(settings).getByRole('button', { name: 'Sync now' })).toBeInTheDocument();

    const filters = within(settings).getByRole('group', { name: 'Recipe filters' });
    expect(within(filters).getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
    await userEvent.click(within(filters).getByRole('button', { name: 'pizza' }));
    await userEvent.click(within(settings).getByRole('button', { name: 'Back to recipes' }));

    const pizzaList = screen.getByRole('list', { name: 'Recipes' });
    expect(within(pizzaList).getByText('NYC Pizza')).toBeInTheDocument();
    expect(within(pizzaList).queryByText('Breakfast Fruit Smoothie')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Favorites' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    expect(screen.getByRole('searchbox', { name: 'Search recipes' })).toBeInTheDocument();
    expect(screen.getByText('No recipes match your search or filters.')).toBeInTheDocument();
  });

  it('shows seeded recipes, searches them, and opens a readable detail pane', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Recipe Box/i })).toBeInTheDocument();
    await screen.findByRole('list', { name: /Recipes/i });

    await userEvent.type(screen.getByLabelText(/Search recipes/i), 'pizza');

    const list = screen.getByRole('list', { name: /Recipes/i });
    expect(within(list).getByText(/NYC Pizza/i)).toBeInTheDocument();
    expect(within(list).queryByText(/Breakfast Fruit Smoothie/i)).not.toBeInTheDocument();

    await userEvent.click(within(list).getByRole('button', { name: /Open NYC Pizza/i }));

    expect(screen.getByRole('link', { name: 'Skip to recipe' })).toHaveAttribute('href', '#recipe-detail');
    expect(screen.getByRole('heading', { name: /NYC Pizza/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ingredients/i })).toBeInTheDocument();
  });

  it('returns from detail without clearing the active search', async () => {
    const { container } = render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    const search = screen.getByRole('searchbox', { name: 'Search recipes' });
    expect(screen.queryByRole('button', { name: 'Back to recipes' })).not.toBeInTheDocument();

    await userEvent.type(search, 'pizza');
    await userEvent.click(within(list).getByRole('button', { name: /Open NYC Pizza/i }));

    const detailWorkspace = container.querySelector('.workspace[data-view="detail"]');
    expect(detailWorkspace?.querySelector('.recipe-rail.wide-collection-context')).toBeInTheDocument();
    expect(detailWorkspace?.querySelector('.recipe-detail.active-surface')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    expect(screen.getByRole('searchbox', { name: 'Search recipes' })).toHaveValue('pizza');
    expect(screen.getByRole('list', { name: 'Recipes' })).toBeInTheDocument();
  });

  it('returns from settings to recipe detail', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipe' }));

    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
  });

  it('keeps the original detail target when settings filters exclude it', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'pizza' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipe' }));

    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
  });

  it('returns from settings to an intact editor draft', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
    const title = screen.getByRole('textbox', { name: 'Title' });
    await userEvent.type(title, 'Summer pasta');
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    const backToEditor = screen.getByRole('button', { name: 'Back to editor' });
    expect(backToEditor).toHaveClass('settings-contextual-back');
    await userEvent.click(backToEditor);

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Summer pasta');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('list', { name: 'Recipes' })).toBeInTheDocument();
  });

  it('keeps an existing editor target and draft when settings filters exclude it', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const title = screen.getByRole('textbox', { name: 'Title' });
    await userEvent.clear(title);
    await userEvent.type(title, 'Baguette draft');
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'pizza' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to editor' }));

    expect(screen.getByRole('heading', { name: 'Edit Baguette' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Baguette draft');
  });

  it('restores collection scroll context after returning from detail', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    list.scrollTop = 420;
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    expect(screen.getByRole('list', { name: 'Recipes' })).toHaveProperty('scrollTop', 420);
  });

  it('starts a newly opened screen at the top of the mobile document', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));

    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  });

  it('keeps a lower selected recipe visible when it becomes wide-rail context', async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    scrollIntoView.mockClear();
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    const lowerRecipe = within(list).getByRole('button', {
      name: /Open The Easiest Actually Good Bread/i
    });
    await userEvent.click(lowerRecipe);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(lowerRecipe);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('restores recipe-list scroll after settings and editor round trips', async () => {
    render(<App />);

    let list = await screen.findByRole('list', { name: 'Recipes' });
    list.scrollTop = 310;
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));
    list = screen.getByRole('list', { name: 'Recipes' });
    expect(list).toHaveProperty('scrollTop', 310);

    list.scrollTop = 260;
    await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('list', { name: 'Recipes' })).toHaveProperty('scrollTop', 260);
  });

  it('gives settings and the editor explicit return actions', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
    expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('list', { name: 'Recipes' })).toBeInTheDocument();
  });

  it('cancels editing an existing recipe back to its detail', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to recipes' })).toBeInTheDocument();
  });

  it('cancels a new recipe back to the screen it was opened from', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await openManualEditor(screen.getByRole('button', { name: 'Add recipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { name: 'Baguette' })).toBeInTheDocument();
  });

  it('lets cooks mark ingredients as applied while reading a recipe', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open 2 Dollar Burrito/i }));
    const ingredient = screen.getByRole('checkbox', { name: /Tortillas/i });
    expect(ingredient).not.toBeChecked();
    expect(screen.getByText(/0 of 45 applied/i)).toBeInTheDocument();

    await userEvent.click(ingredient);

    expect(ingredient).toBeChecked();
    expect(screen.getByText(/1 of 45 applied/i)).toBeInTheDocument();
  });

  it('keeps unavailable cloud actions disabled in local mode', async () => {
    render(<App />);

    await userEvent.click(screen.getByLabelText(/Open household settings/i));

    expect(await screen.findByText(/Offline ready/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send magic link/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Join household/i })).toBeDisabled();
    expect(screen.getByLabelText(/Email/i)).toBeDisabled();
    expect(screen.getByLabelText(/Join code/i)).toBeDisabled();
  });

  it('asks for confirmation before deleting a recipe', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open 2 Dollar Burrito/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));

    expect(screen.getByRole('button', { name: /Confirm delete/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2 Dollar Burrito but Cheaper/i })).toBeInTheDocument();
  });

  it('explains when a recipe has no directions yet', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Birthday Cake/i }));

    expect(screen.getByText(/No directions saved yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add directions/i })).toBeInTheDocument();
  });

  it('offers an edit action for empty ingredients and shows an unlinked source label', async () => {
    render(<App />);

    const original = seedRecipes.find((recipe) => recipe.title === 'Baguette')!;
    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Source label' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Source label' }), 'Family notebook');
    await userEvent.clear(screen.getByRole('textbox', { name: 'Source URL' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Ingredients' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    expect(await screen.findByText('No ingredients saved yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add ingredients' })).toBeInTheDocument();
    expect(screen.getByText('Source: Family notebook')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Family notebook/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    if (original.sourceUrl) {
      await userEvent.type(screen.getByRole('textbox', { name: 'Source URL' }), original.sourceUrl);
    }
    await userEvent.clear(screen.getByRole('textbox', { name: 'Source label' }));
    if (original.sourceLabel) {
      await userEvent.type(screen.getByRole('textbox', { name: 'Source label' }), original.sourceLabel);
    }
    await userEvent.type(screen.getByRole('textbox', { name: 'Ingredients' }), original.ingredients.join('\n'));
    await userEvent.click(screen.getByRole('button', { name: 'Save recipe' }));
    await screen.findByRole('heading', { name: 'Baguette' });
  });
});

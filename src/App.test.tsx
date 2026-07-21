import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App, { RecipeThumbnail } from './App';
import type { Recipe } from './lib/types';

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
  it('shows identity, search, and an alphabetical title-led recipe list', async () => {
    render(<App />);

    const heading = await screen.findByRole('heading', { name: 'Recipe Box' });
    const search = screen.getByRole('searchbox', { name: 'Search recipes' });
    const list = await screen.findByRole('list', { name: 'Recipes' });

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

    expect(screen.getByText('No recipes match that search.')).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { name: /NYC Pizza/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ingredients/i })).toBeInTheDocument();
  });

  it('returns from detail without clearing the active search', async () => {
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    const search = screen.getByRole('searchbox', { name: 'Search recipes' });
    expect(screen.queryByRole('button', { name: 'Back to recipes' })).not.toBeInTheDocument();

    await userEvent.type(search, 'pizza');
    await userEvent.click(within(list).getByRole('button', { name: /Open NYC Pizza/i }));

    expect(screen.queryByRole('list', { name: 'Recipes' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    expect(screen.getByRole('searchbox', { name: 'Search recipes' })).toHaveValue('pizza');
    expect(screen.getByRole('list', { name: 'Recipes' })).toBeInTheDocument();
  });

  it('restores collection scroll context after returning from detail', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 420 });
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(within(list).getByRole('button', { name: /Open Baguette/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    expect(scrollTo).toHaveBeenLastCalledWith({ top: 420 });
    scrollTo.mockRestore();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('gives settings and the editor explicit return actions', async () => {
    render(<App />);

    await screen.findByRole('list', { name: 'Recipes' });
    await userEvent.click(screen.getByRole('button', { name: 'Open household settings' }));
    expect(screen.queryByRole('list', { name: 'Recipes' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
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
    await userEvent.click(screen.getByRole('button', { name: 'Add recipe' }));
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

    const list = await screen.findByRole('list', { name: /Recipes/i });
    await userEvent.click(within(list).getByRole('button', { name: /Open Birthday Cake/i }));

    expect(screen.getByText(/No directions saved yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add directions/i })).toBeInTheDocument();
  });
});

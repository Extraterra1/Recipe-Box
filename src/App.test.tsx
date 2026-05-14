import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Recipe Box app shell', () => {
  it('shows seeded recipes, searches them, and opens a readable detail pane', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Recipe Box/i })).toBeInTheDocument();
    expect(await screen.findByText(/Offline ready/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Search recipes/i), 'pizza');

    const list = screen.getByRole('list', { name: /Recipes/i });
    expect(within(list).getByText(/NYC Pizza/i)).toBeInTheDocument();
    expect(within(list).queryByText(/Breakfast Fruit Smoothie/i)).not.toBeInTheDocument();

    await userEvent.click(within(list).getByRole('button', { name: /Open NYC Pizza/i }));

    expect(screen.getByRole('heading', { name: /NYC Pizza/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ingredients/i })).toBeInTheDocument();
  });

  it('lets cooks mark ingredients as applied while reading a recipe', async () => {
    render(<App />);

    expect(await screen.findByText(/Offline ready/i)).toBeInTheDocument();

    const ingredient = screen.getByRole('checkbox', { name: /Tortillas/i });
    expect(ingredient).not.toBeChecked();
    expect(screen.getByText(/0 of 45 applied/i)).toBeInTheDocument();

    await userEvent.click(ingredient);

    expect(ingredient).toBeChecked();
    expect(screen.getByText(/1 of 45 applied/i)).toBeInTheDocument();
  });

  it('keeps unavailable cloud actions disabled in local mode', async () => {
    render(<App />);

    expect(await screen.findByText(/Offline ready/i)).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Open household settings/i));

    expect(screen.getByRole('button', { name: /Send magic link/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Join household/i })).toBeDisabled();
    expect(screen.getByLabelText(/Email/i)).toBeDisabled();
    expect(screen.getByLabelText(/Join code/i)).toBeDisabled();
  });

  it('asks for confirmation before deleting a recipe', async () => {
    render(<App />);

    expect(await screen.findByText(/Offline ready/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Delete$/i }));

    expect(screen.getByRole('button', { name: /Confirm delete/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2 Dollar Burrito but Cheaper/i })).toBeInTheDocument();
  });

  it('explains when a recipe has no directions yet', async () => {
    render(<App />);

    expect(await screen.findByText(/Offline ready/i)).toBeInTheDocument();

    const list = screen.getByRole('list', { name: /Recipes/i });
    await userEvent.click(within(list).getByRole('button', { name: /Open Birthday Cake/i }));

    expect(screen.getByText(/No directions saved yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add directions/i })).toBeInTheDocument();
  });
});

import {
  Archive,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  Edit3,
  Heart,
  Home,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Settings,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { seedRecipes } from './data/seedRecipes';
import { downloadRecipes } from './lib/export';
import { exportRecipesAsMarkdown, parseRecipeMarkdown, slugify } from './lib/markdown';
import { filterRecipes, getAllTags, getRecipeSummary } from './lib/recipeSearch';
import {
  ensureCookbook,
  getSession,
  joinCookbookByInvite,
  loadRecipes,
  removeRecipe,
  saveRecipe,
  seedRecipesIfNeeded,
  signInWithMagicLink,
  signOut
} from './lib/recipeService';
import { hasSupabaseConfig } from './lib/supabaseClient';
import type { Cookbook, Recipe, SyncState } from './lib/types';

const INGREDIENT_CHECKS_KEY = 'recipe-box-ingredient-checks';

const BLANK_RECIPE: Recipe = {
  id: '',
  title: '',
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

type IngredientChecks = Record<string, number[]>;

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [statusMessage, setStatusMessage] = useState('Getting the recipe drawer ready...');
  const [activePanel, setActivePanel] = useState<'recipes' | 'settings'>('recipes');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [lastDeleted, setLastDeleted] = useState<Recipe | null>(null);
  const [ingredientChecks, setIngredientChecks] = useState<IngredientChecks>(() => loadIngredientChecks());

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    saveIngredientChecks(ingredientChecks);
  }, [ingredientChecks]);

  const tags = useMemo(() => getAllTags(recipes), [recipes]);
  const filteredRecipes = useMemo(
    () => filterRecipes(recipes, { query, tags: selectedTags, favoritesOnly }),
    [favoritesOnly, query, recipes, selectedTags]
  );
  const selectedRecipe = filteredRecipes.find((recipe) => recipe.id === selectedId) ?? filteredRecipes[0] ?? recipes[0];

  useEffect(() => {
    if (!selectedId && selectedRecipe) {
      setSelectedId(selectedRecipe.id);
    }
  }, [selectedId, selectedRecipe]);

  useEffect(() => {
    if (filteredRecipes.length && !filteredRecipes.some((recipe) => recipe.id === selectedId)) {
      setSelectedId(filteredRecipes[0].id);
      setEditingRecipe(null);
    }
  }, [filteredRecipes, selectedId]);

  async function bootstrap() {
    setSyncState(navigator.onLine ? 'syncing' : 'offline');
    try {
      const session = await getSession();
      const activeCookbook = await ensureCookbook(session);
      setCookbook(activeCookbook);
      const seeded = await seedRecipesIfNeeded(activeCookbook.id, seedRecipes);
      const loaded = await loadRecipes(activeCookbook.id);
      const nextRecipes = loaded.length ? loaded : seeded;
      setRecipes(nextRecipes);
      setSelectedId(nextRecipes[0]?.id ?? '');
      setSyncState(hasSupabaseConfig && navigator.onLine ? 'success' : 'offline');
      setStatusMessage(hasSupabaseConfig && navigator.onLine ? 'Synced just now' : 'Offline ready');
    } catch (error) {
      setRecipes(seedRecipes);
      setSelectedId(seedRecipes[0]?.id ?? '');
      setSyncState('error');
      setStatusMessage(getErrorMessage(error));
    }
  }

  async function refreshRecipes() {
    if (!cookbook) {
      return;
    }

    setSyncState(navigator.onLine ? 'syncing' : 'offline');
    try {
      const loaded = await loadRecipes(cookbook.id);
      setRecipes(loaded.length ? loaded : recipes);
      setSyncState(hasSupabaseConfig && navigator.onLine ? 'success' : 'offline');
      setStatusMessage(hasSupabaseConfig && navigator.onLine ? 'Synced just now' : 'Offline ready');
    } catch (error) {
      setSyncState('error');
      setStatusMessage(getErrorMessage(error));
    }
  }

  async function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authEmail) {
      return;
    }

    setSyncState('syncing');
    try {
      await signInWithMagicLink(authEmail);
      setSyncState('success');
      setStatusMessage('Check your email for the sign-in link.');
    } catch (error) {
      setSyncState('error');
      setStatusMessage(getErrorMessage(error));
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteCode) {
      return;
    }

    try {
      const session = await getSession();
      const joined = await joinCookbookByInvite(session, inviteCode);
      setCookbook(joined);
      const loaded = await loadRecipes(joined.id);
      setRecipes(loaded);
      setSelectedId(loaded[0]?.id ?? '');
      setStatusMessage(`Joined ${joined.name}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
      setSyncState('error');
    }
  }

  async function persistRecipe(recipe: Recipe) {
    if (!cookbook) {
      return;
    }

    setSyncState(navigator.onLine ? 'syncing' : 'offline');
    try {
      const saved = await saveRecipe(cookbook.id, recipe);
      setRecipes((current) => upsertRecipeList(current, saved));
      setSelectedId(saved.id);
      setEditingRecipe(null);
      setSyncState(navigator.onLine ? 'success' : 'offline');
      setStatusMessage(navigator.onLine ? 'Saved and synced' : 'Saved offline');
    } catch (error) {
      setSyncState('error');
      setStatusMessage(getErrorMessage(error));
    }
  }

  async function deleteRecipe(recipe: Recipe) {
    if (!cookbook) {
      return;
    }

    setLastDeleted(recipe);
    setRecipes((current) => current.filter((item) => item.id !== recipe.id));
    setSelectedId((current) => (current === recipe.id ? '' : current));
    setStatusMessage(`${recipe.title} deleted. Undo is available.`);

    try {
      await removeRecipe(cookbook.id, recipe.id);
    } catch (error) {
      setRecipes((current) => upsertRecipeList(current, recipe));
      setSyncState('error');
      setStatusMessage(getErrorMessage(error));
    }
  }

  async function undoDelete() {
    if (!lastDeleted || !cookbook) {
      return;
    }

    await persistRecipe(lastDeleted);
    setLastDeleted(null);
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  function toggleFavorite(recipe: Recipe) {
    void persistRecipe({ ...recipe, favorite: !recipe.favorite });
  }

  function toggleIngredient(recipeId: string, ingredientIndex: number) {
    setIngredientChecks((current) => {
      const checked = new Set(current[recipeId] ?? []);
      if (checked.has(ingredientIndex)) {
        checked.delete(ingredientIndex);
      } else {
        checked.add(ingredientIndex);
      }

      return {
        ...current,
        [recipeId]: Array.from(checked).sort((a, b) => a - b)
      };
    });
  }

  function resetIngredients(recipeId: string) {
    setIngredientChecks((current) => {
      const { [recipeId]: _recipeChecks, ...remaining } = current;
      return remaining;
    });
  }

  function startNewRecipe() {
    const now = new Date().toISOString();
    setEditingRecipe({
      ...BLANK_RECIPE,
      id: `local-${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now
    });
    setActivePanel('recipes');
  }

  async function importMarkdown(markdown: string) {
    const parsed = parseRecipeMarkdown(markdown, `import-${Date.now()}`);
    await persistRecipe({ ...parsed, id: `local-${crypto.randomUUID()}` });
  }

  return (
    <div className="app-shell">
      <a href="#recipe-detail" className="skip-link">
        Skip to recipe
      </a>
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Archive size={22} />
          </span>
          <div>
            <p className="eyebrow">Household</p>
            <h1>Recipe Box</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <SyncBadge state={syncState} message={statusMessage} />
          <button type="button" className="icon-button" onClick={() => void refreshRecipes()} aria-label="Sync now">
            <RefreshCcw size={18} />
          </button>
          <button
            type="button"
            className={activePanel === 'settings' ? 'icon-button active' : 'icon-button'}
            onClick={() => setActivePanel((panel) => (panel === 'settings' ? 'recipes' : 'settings'))}
            aria-label="Open household settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="recipe-rail" aria-label="Recipe browser">
          <div className="search-wrap">
            <Search size={18} aria-hidden="true" />
            <label className="sr-only" htmlFor="recipe-search">
              Search recipes
            </label>
            <input
              id="recipe-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes"
              autoComplete="off"
            />
          </div>

          <div className="rail-toolbar" aria-label="Recipe filters">
            <button
              type="button"
              className={favoritesOnly ? 'chip selected' : 'chip'}
              onClick={() => setFavoritesOnly((value) => !value)}
            >
              <Heart size={15} /> Favorites
            </button>
            <button type="button" className="chip action" onClick={startNewRecipe}>
              <Plus size={15} /> Create recipe
            </button>
          </div>

          <div className="tag-strip" aria-label="Tags">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag}
                className={selectedTags.includes(tag) ? 'tag selected' : 'tag'}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <RecipeList
            recipes={filteredRecipes}
            selectedId={selectedRecipe?.id}
            onSelect={(recipe) => {
              setSelectedId(recipe.id);
              setEditingRecipe(null);
              setActivePanel('recipes');
            }}
            onFavorite={toggleFavorite}
          />
        </aside>

        {activePanel === 'settings' ? (
          <SettingsPanel
            cookbook={cookbook}
            authEmail={authEmail}
            inviteCode={inviteCode}
            recipes={recipes}
            onAuthEmailChange={setAuthEmail}
            onInviteCodeChange={setInviteCode}
            onMagicLink={submitMagicLink}
            onInvite={submitInvite}
            onImportMarkdown={(value) => void importMarkdown(value)}
            onSignOut={() => void signOut()}
          />
        ) : editingRecipe ? (
          <RecipeEditor
            recipe={editingRecipe}
            onCancel={() => setEditingRecipe(null)}
            onSave={(recipe) => void persistRecipe(recipe)}
          />
        ) : selectedRecipe ? (
          <RecipeDetail
            recipe={selectedRecipe}
            checkedIngredientIndexes={ingredientChecks[selectedRecipe.id] ?? []}
            onEdit={() => setEditingRecipe(selectedRecipe)}
            onDelete={() => void deleteRecipe(selectedRecipe)}
            onFavorite={() => toggleFavorite(selectedRecipe)}
            onToggleIngredient={(ingredientIndex) => toggleIngredient(selectedRecipe.id, ingredientIndex)}
            onResetIngredients={() => resetIngredients(selectedRecipe.id)}
          />
        ) : (
          <EmptyDetail onCreate={startNewRecipe} />
        )}
      </main>

      {lastDeleted ? (
        <div className="toast" role="status">
          <span>{lastDeleted.title} deleted.</span>
          <button type="button" onClick={() => void undoDelete()}>
            Undo
          </button>
          <button type="button" aria-label="Dismiss delete message" onClick={() => setLastDeleted(null)}>
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SyncBadge({ state, message }: { state: SyncState; message: string }) {
  const icon = state === 'offline' ? <CloudOff size={16} /> : state === 'success' ? <CheckCircle2 size={16} /> : <Cloud size={16} />;
  return (
    <div className={`sync-badge ${state}`} role="status">
      {icon}
      <span>{state === 'offline' ? 'Offline ready' : message}</span>
    </div>
  );
}

function RecipeList({
  recipes,
  selectedId,
  onSelect,
  onFavorite
}: {
  recipes: Recipe[];
  selectedId?: string;
  onSelect: (recipe: Recipe) => void;
  onFavorite: (recipe: Recipe) => void;
}) {
  if (!recipes.length) {
    return (
      <div className="empty-list">
        <p>No recipes match that search.</p>
      </div>
    );
  }

  return (
    <ul className="recipe-list" aria-label="Recipes">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <button
            type="button"
            className={selectedId === recipe.id ? 'recipe-row selected' : 'recipe-row'}
            onClick={() => onSelect(recipe)}
            aria-label={`Open ${recipe.title}`}
          >
            <span className="recipe-row-main">
              <span className="recipe-title">{recipe.title}</span>
              <span className="recipe-meta">{getRecipeSummary(recipe)}</span>
            </span>
            <span className="recipe-row-tags">{recipe.tags.slice(0, 2).join(' · ')}</span>
          </button>
          <button
            type="button"
            className={recipe.favorite ? 'favorite-button active' : 'favorite-button'}
            aria-label={recipe.favorite ? `Unfavorite ${recipe.title}` : `Favorite ${recipe.title}`}
            onClick={() => onFavorite(recipe)}
          >
            <Heart size={16} fill="currentColor" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function RecipeDetail({
  recipe,
  checkedIngredientIndexes,
  onEdit,
  onDelete,
  onFavorite,
  onToggleIngredient,
  onResetIngredients
}: {
  recipe: Recipe;
  checkedIngredientIndexes: number[];
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onToggleIngredient: (ingredientIndex: number) => void;
  onResetIngredients: () => void;
}) {
  const checkedIngredients = new Set(checkedIngredientIndexes);
  const appliedCount = recipe.ingredients.filter((_, index) => checkedIngredients.has(index)).length;

  return (
    <article className="recipe-detail" id="recipe-detail">
      <div className="detail-head">
        <div>
          <p className="eyebrow">{recipe.tags.slice(0, 3).join(' · ') || 'Recipe'}</p>
          <h2>{recipe.title}</h2>
          {recipe.metadata ? <p className="detail-meta">{recipe.metadata}</p> : null}
        </div>
        <div className="detail-actions">
          <button type="button" className={recipe.favorite ? 'button subtle active' : 'button subtle'} onClick={onFavorite}>
            <Heart size={17} fill="currentColor" /> Favorite
          </button>
          <button type="button" className="button subtle" onClick={onEdit}>
            <Edit3 size={17} /> Edit
          </button>
          <button type="button" className="button danger" onClick={onDelete}>
            <Trash2 size={17} /> Delete
          </button>
        </div>
      </div>

      {recipe.sourceUrl ? (
        <a className="source-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
          View source: {recipe.sourceLabel || recipe.sourceUrl}
        </a>
      ) : null}

      <div className="recipe-columns">
        <section className="ingredient-panel" aria-labelledby="ingredients-heading">
          <div className="ingredient-panel-head">
            <div>
              <h3 id="ingredients-heading">Ingredients</h3>
              <p>{appliedCount} of {recipe.ingredients.length} applied</p>
            </div>
            {appliedCount ? (
              <button type="button" className="text-button" onClick={onResetIngredients}>
                Reset
              </button>
            ) : null}
          </div>
          <ul className="ingredient-checklist">
            {recipe.ingredients.map((ingredient, index) => {
              const isChecked = checkedIngredients.has(index);
              return (
                <li key={`${ingredient}-${index}`} className={isChecked ? 'applied' : undefined}>
                  <label className="ingredient-check">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleIngredient(index)}
                    />
                    <span className="ingredient-checkmark" aria-hidden="true" />
                    <span className="ingredient-text">{ingredient}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="direction-panel" aria-labelledby="directions-heading">
          <h3 id="directions-heading">Directions</h3>
          <ol>
            {recipe.directions.map((direction, index) => (
              <li key={`${direction}-${index}`}>{direction}</li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.notes.length || recipe.nutrition.length ? (
        <div className="detail-notes">
          {recipe.notes.length ? (
            <section>
              <h3>Notes</h3>
              <ul>
                {recipe.notes.map((note, index) => (
                  <li key={`${note}-${index}`}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {recipe.nutrition.length ? (
            <section>
              <h3>Nutrition</h3>
              <ul>
                {recipe.nutrition.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function RecipeEditor({
  recipe,
  onCancel,
  onSave
}: {
  recipe: Recipe;
  onCancel: () => void;
  onSave: (recipe: Recipe) => void;
}) {
  const [draft, setDraft] = useState(recipeToDraft(recipe));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave({
      ...recipe,
      id: recipe.id || `local-${crypto.randomUUID()}`,
      title: draft.title.trim(),
      sourceLabel: draft.sourceLabel.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      metadata: draft.metadata.trim(),
      ingredients: linesToArray(draft.ingredients),
      directions: linesToArray(draft.directions),
      notes: linesToArray(draft.notes),
      nutrition: linesToArray(draft.nutrition),
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      favorite: recipe.favorite,
      createdAt: recipe.createdAt || now,
      updatedAt: now
    });
  }

  return (
    <section className="editor-surface" aria-labelledby="editor-heading">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Recipe editor</p>
          <h2 id="editor-heading">{recipe.title ? `Edit ${recipe.title}` : 'Create recipe'}</h2>
        </div>
      </div>
      <form className="recipe-form" onSubmit={submit}>
        <label>
          Title
          <input
            value={draft.title}
            required
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            Source label
            <input
              value={draft.sourceLabel}
              onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })}
            />
          </label>
          <label>
            Source URL
            <input
              value={draft.sourceUrl}
              inputMode="url"
              onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
            />
          </label>
        </div>
        <label>
          Metadata
          <input
            value={draft.metadata}
            onChange={(event) => setDraft({ ...draft, metadata: event.target.value })}
            placeholder="Servings, prep time, cook time"
          />
        </label>
        <label>
          Tags
          <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} />
        </label>
        <div className="form-grid textareas">
          <label>
            Ingredients
            <textarea
              rows={10}
              value={draft.ingredients}
              onChange={(event) => setDraft({ ...draft, ingredients: event.target.value })}
            />
          </label>
          <label>
            Directions
            <textarea
              rows={10}
              value={draft.directions}
              onChange={(event) => setDraft({ ...draft, directions: event.target.value })}
            />
          </label>
        </div>
        <div className="form-grid textareas">
          <label>
            Notes
            <textarea rows={5} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <label>
            Nutrition
            <textarea
              rows={5}
              value={draft.nutrition}
              onChange={(event) => setDraft({ ...draft, nutrition: event.target.value })}
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="button subtle" onClick={onCancel}>
            Keep browsing
          </button>
          <button type="submit" className="button primary">
            Save recipe
          </button>
        </div>
      </form>
    </section>
  );
}

function SettingsPanel({
  cookbook,
  authEmail,
  inviteCode,
  recipes,
  onAuthEmailChange,
  onInviteCodeChange,
  onMagicLink,
  onInvite,
  onImportMarkdown,
  onSignOut
}: {
  cookbook: Cookbook | null;
  authEmail: string;
  inviteCode: string;
  recipes: Recipe[];
  onAuthEmailChange: (value: string) => void;
  onInviteCodeChange: (value: string) => void;
  onMagicLink: (event: FormEvent<HTMLFormElement>) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onImportMarkdown: (markdown: string) => void;
  onSignOut: () => void;
}) {
  const [markdown, setMarkdown] = useState('');

  return (
    <section className="settings-surface" aria-labelledby="settings-heading">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Household settings</p>
          <h2 id="settings-heading">{cookbook?.name ?? 'Recipe Box'}</h2>
        </div>
        <Home className="settings-home" size={28} aria-hidden="true" />
      </div>

      <div className="settings-grid">
        <section className="settings-section">
          <h3>Supabase</h3>
          {hasSupabaseConfig ? (
            <p className="settings-copy">Connected with browser-safe credentials.</p>
          ) : (
            <p className="settings-copy">Add Supabase values in `.env` to turn on cloud auth and sync.</p>
          )}
          <form onSubmit={onMagicLink} className="compact-form">
            <label>
              Email
              <input
                type="email"
                value={authEmail}
                onChange={(event) => onAuthEmailChange(event.target.value)}
                placeholder="cook@example.com"
              />
            </label>
            <button type="submit" className="button primary">
              <Send size={16} /> Send magic link
            </button>
          </form>
          <button type="button" className="button subtle" onClick={onSignOut}>
            <LogOut size={16} /> Sign out
          </button>
        </section>

        <section className="settings-section">
          <h3>Invite</h3>
          <p className="invite-code">{cookbook?.inviteCode ?? 'LOCAL'}</p>
          <form onSubmit={onInvite} className="compact-form">
            <label>
              Join code
              <input value={inviteCode} onChange={(event) => onInviteCodeChange(event.target.value)} />
            </label>
            <button type="submit" className="button subtle">
              Join household
            </button>
          </form>
        </section>

        <section className="settings-section">
          <h3>Export</h3>
          <div className="button-row">
            <button type="button" className="button subtle" onClick={() => downloadRecipes(recipes, 'markdown')}>
              <Download size={16} /> Markdown
            </button>
            <button type="button" className="button subtle" onClick={() => downloadRecipes(recipes, 'json')}>
              <Download size={16} /> JSON
            </button>
          </div>
          <textarea readOnly value={exportRecipesAsMarkdown(recipes.slice(0, 1))} aria-label="Export preview" rows={8} />
        </section>

        <section className="settings-section">
          <h3>Import</h3>
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            rows={8}
            placeholder="# Recipe title"
            aria-label="Markdown import"
          />
          <button
            type="button"
            className="button primary"
            onClick={() => {
              onImportMarkdown(markdown);
              setMarkdown('');
            }}
            disabled={!markdown.trim()}
          >
            <Upload size={16} /> Import recipe
          </button>
        </section>
      </div>
    </section>
  );
}

function EmptyDetail({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="empty-detail">
      <h2>No recipe selected</h2>
      <p>Create a recipe or loosen the filters.</p>
      <button type="button" className="button primary" onClick={onCreate}>
        <Plus size={17} /> Create recipe
      </button>
    </section>
  );
}

function recipeToDraft(recipe: Recipe) {
  return {
    title: recipe.title,
    sourceLabel: recipe.sourceLabel,
    sourceUrl: recipe.sourceUrl,
    metadata: recipe.metadata,
    ingredients: recipe.ingredients.join('\n'),
    directions: recipe.directions.join('\n'),
    notes: recipe.notes.join('\n'),
    nutrition: recipe.nutrition.join('\n'),
    tags: recipe.tags.join(', ')
  };
}

function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim().replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''))
    .filter(Boolean);
}

function upsertRecipeList(recipes: Recipe[], recipe: Recipe): Recipe[] {
  const next = recipes.some((item) => item.id === recipe.id)
    ? recipes.map((item) => (item.id === recipe.id ? recipe : item))
    : [...recipes, recipe];
  return next.sort((a, b) => a.title.localeCompare(b.title));
}

function loadIngredientChecks(): IngredientChecks {
  if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(INGREDIENT_CHECKS_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([recipeId, indexes]) => {
        if (!Array.isArray(indexes)) {
          return [];
        }

        const normalized = indexes.filter((index): index is number => Number.isInteger(index) && index >= 0);
        return normalized.length ? [[recipeId, normalized]] : [];
      })
    );
  } catch {
    return {};
  }
}

function saveIngredientChecks(checks: IngredientChecks) {
  if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
    return;
  }

  try {
    window.localStorage.setItem(INGREDIENT_CHECKS_KEY, JSON.stringify(checks));
  } catch {
    // Cooking progress is helpful, but never worth interrupting the recipe view.
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong on our end. Try again.';
}

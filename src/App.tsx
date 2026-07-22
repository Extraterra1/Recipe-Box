import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
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
import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { seedRecipes } from './data/seedRecipes';
import { downloadRecipes } from './lib/export';
import { exportRecipesAsMarkdown, parseRecipeMarkdown, slugify } from './lib/markdown';
import { filterRecipes, getAllTags } from './lib/recipeSearch';
import {
  getRecipeImportAvailability,
  importRecipeFromUrl,
  normalizeRecipeUrl
} from './lib/recipeImport';
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
  imageUrl: '',
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
type AppView = 'collection' | 'detail' | 'editor' | 'settings';
type AddSurface = 'closed' | 'choices' | 'url';
export type RecipeSort = 'alphabetical' | 'recent';

export function sortRecipes(recipes: Recipe[], sort: RecipeSort) {
  return [...recipes].sort((a, b) => {
    if (sort === 'recent') {
      const aParsed = Date.parse(a.updatedAt);
      const bParsed = Date.parse(b.updatedAt);
      const aTimestamp = Number.isFinite(aParsed) ? aParsed : Number.NEGATIVE_INFINITY;
      const bTimestamp = Number.isFinite(bParsed) ? bParsed : Number.NEGATIVE_INFINITY;
      const dateDifference = bTimestamp - aTimestamp;
      if (dateDifference) {
        return dateDifference;
      }
    }
    return a.title.localeCompare(b.title);
  });
}

function createLocalRecipeId() {
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `local-${id}`;
}

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [recipeSort, setRecipeSort] = useState<RecipeSort>('alphabetical');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [statusMessage, setStatusMessage] = useState('Getting the recipe drawer ready...');
  const [view, setView] = useState<AppView>('collection');
  const [editorReturnView, setEditorReturnView] = useState<'collection' | 'detail'>('collection');
  const [settingsReturnView, setSettingsReturnView] = useState<Exclude<AppView, 'settings'>>('collection');
  const [settingsTarget, setSettingsTarget] = useState<'overview' | 'data'>('overview');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [addSurface, setAddSurface] = useState<AddSurface>('closed');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [recipeUrlError, setRecipeUrlError] = useState('');
  const [isImportingRecipe, setIsImportingRecipe] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [lastDeleted, setLastDeleted] = useState<Recipe | null>(null);
  const [ingredientChecks, setIngredientChecks] = useState<IngredientChecks>(() => loadIngredientChecks());
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const recipeListRef = useRef<HTMLUListElement | null>(null);
  const collectionScrollTop = useRef(0);
  const collectionWindowScrollTop = useRef(0);
  const preserveSelectionOnSettingsReturn = useRef(false);
  const detailFilterSnapshot = useRef<{ selectedTags: string[]; favoritesOnly: boolean } | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    saveIngredientChecks(ingredientChecks);
  }, [ingredientChecks]);

  useLayoutEffect(() => {
    if ((view === 'collection' || view === 'detail') && recipeListRef.current) {
      recipeListRef.current.scrollTop = collectionScrollTop.current;
    }
  }, [view]);

  useLayoutEffect(() => {
    window.scrollTo({
      top: view === 'collection' ? collectionWindowScrollTop.current : 0,
      behavior: 'instant'
    });
  }, [view]);

  const tags = useMemo(() => getAllTags(recipes), [recipes]);
  const favoriteCount = useMemo(() => recipes.filter((recipe) => recipe.favorite).length, [recipes]);
  const tagCounts = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag, recipes.filter((recipe) => recipe.tags.includes(tag)).length])),
    [recipes, tags]
  );
  const filteredRecipes = useMemo(
    () => sortRecipes(filterRecipes(recipes, { query, tags: selectedTags, favoritesOnly }), recipeSort),
    [favoritesOnly, query, recipeSort, recipes, selectedTags]
  );
  const selectedRecipe = filteredRecipes.find((recipe) => recipe.id === selectedId) ?? filteredRecipes[0];

  useLayoutEffect(() => {
    if (view !== 'detail') {
      return;
    }

    recipeListRef.current
      ?.querySelector<HTMLElement>('.recipe-row.selected')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, view]);

  useEffect(() => {
    if (!selectedId && selectedRecipe) {
      setSelectedId(selectedRecipe.id);
    }
  }, [selectedId, selectedRecipe]);

  useEffect(() => {
    if (preserveSelectionOnSettingsReturn.current && view === 'detail') {
      preserveSelectionOnSettingsReturn.current = false;
      return;
    }
    if ((view === 'collection' || view === 'detail') && filteredRecipes.length && !filteredRecipes.some((recipe) => recipe.id === selectedId)) {
      setSelectedId(filteredRecipes[0].id);
    } else if ((view === 'collection' || view === 'detail') && !filteredRecipes.length && selectedId) {
      setSelectedId('');
    }
  }, [filteredRecipes, selectedId, view]);

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
    } finally {
      setIsBootstrapping(false);
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

  async function persistRecipe(recipe: Recipe, returnView: 'collection' | 'detail' = 'detail') {
    if (!cookbook) {
      return;
    }

    setSyncState(navigator.onLine ? 'syncing' : 'offline');
    try {
      const saved = await saveRecipe(cookbook.id, recipe);
      setRecipes((current) => upsertRecipeList(current, saved));
      setSelectedId(saved.id);
      setEditingRecipe(null);
      setView(returnView);
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
    setView('collection');
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
    void persistRecipe({ ...recipe, favorite: !recipe.favorite }, view === 'collection' ? 'collection' : 'detail');
  }

  function requestDelete(recipe: Recipe) {
    if (pendingDeleteId !== recipe.id) {
      setPendingDeleteId(recipe.id);
      setStatusMessage(`Press confirm to delete ${recipe.title}.`);
      return;
    }

    setPendingDeleteId('');
    void deleteRecipe(recipe);
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
    rememberCollectionScroll();
    const now = new Date().toISOString();
    setEditingRecipe({
      ...BLANK_RECIPE,
      id: createLocalRecipeId(),
      createdAt: now,
      updatedAt: now
    });
    setEditorReturnView(view === 'detail' ? 'detail' : 'collection');
    setView('editor');
  }

  function openAddMenu() {
    setRecipeUrlError('');
    setAddSurface('choices');
  }

  function closeAddMenu() {
    if (isImportingRecipe) return;
    setRecipeUrlError('');
    setAddSurface('closed');
  }

  function backToAddChoices() {
    if (isImportingRecipe) return;
    setRecipeUrlError('');
    setAddSurface('choices');
  }

  async function submitRecipeUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      normalizeRecipeUrl(recipeUrl);
    } catch (error) {
      setRecipeUrlError(error instanceof Error ? error.message : 'Enter a valid recipe link.');
      return;
    }

    setRecipeUrlError('');
    setIsImportingRecipe(true);
    try {
      const draft = await importRecipeFromUrl(recipeUrl);
      const now = new Date().toISOString();
      rememberCollectionScroll();
      setEditingRecipe({
        ...draft,
        id: createLocalRecipeId(),
        createdAt: now,
        updatedAt: now
      });
      setEditorReturnView(view === 'detail' ? 'detail' : 'collection');
      setAddSurface('closed');
      setRecipeUrl('');
      setView('editor');
    } catch (error) {
      setRecipeUrlError(error instanceof Error ? error.message : 'The recipe page could not be reached. Try again.');
    } finally {
      setIsImportingRecipe(false);
    }
  }

  function openSettings(target: 'overview' | 'data' = 'overview') {
    rememberCollectionScroll();
    if (view !== 'settings') {
      setSettingsReturnView(view);
      detailFilterSnapshot.current = view === 'detail' ? { selectedTags, favoritesOnly } : null;
    }
    setSettingsTarget(target);
    setView('settings');
  }

  function showAllRecipes() {
    setFavoritesOnly(false);
    setSelectedTags([]);
    setView('collection');
  }

  function rememberCollectionScroll() {
    if (recipeListRef.current) {
      collectionScrollTop.current = recipeListRef.current.scrollTop;
    }
    if (view === 'collection') {
      collectionWindowScrollTop.current = window.scrollY;
    }
  }

  async function importMarkdown(markdown: string) {
    const parsed = parseRecipeMarkdown(markdown, `import-${Date.now()}`);
    await persistRecipe({ ...parsed, id: createLocalRecipeId() });
  }

  return (
    <div className="app-shell">
      {view === 'detail' && selectedRecipe ? (
        <a href="#recipe-detail" className="skip-link">
          Skip to recipe
        </a>
      ) : null}
      <header className="topbar">
        <div className="topbar-actions topbar-actions-leading">
          <button type="button" className="icon-button" onClick={openAddMenu} aria-label="Add recipe">
            <Plus size={20} />
          </button>
        </div>
        <a
          href="#recipe-index"
          className="brand-lockup"
          aria-label="Recipe Box home"
          onClick={(event) => {
            event.preventDefault();
            setView('collection');
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <Archive size={22} />
          </span>
          <h1>Recipe Box</h1>
        </a>
        <div className="topbar-actions">
          <button
            type="button"
            className={view === 'settings' ? 'icon-button active' : 'icon-button'}
            onClick={() => openSettings()}
            aria-label="Open household settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className={`workspace desktop-workspace app-view-${view}`} data-view={view} data-mobile-view={view}>
        <LibraryNavigation
          isLoading={isBootstrapping}
          recipeCount={recipes.length}
          favoriteCount={favoriteCount}
          tags={tags}
          tagCounts={tagCounts}
          favoritesOnly={favoritesOnly}
          selectedTags={selectedTags}
          onHome={showAllRecipes}
          onAllRecipes={showAllRecipes}
          onFavorites={() => {
            setFavoritesOnly(true);
            setView('collection');
          }}
          onToggleTag={(tag) => {
            toggleTag(tag);
            setView('collection');
          }}
          onCreate={openAddMenu}
          onImportExport={() => openSettings('data')}
          onSettings={() => openSettings()}
        />
        <aside
          id="recipe-index"
          className={view === 'collection' ? 'recipe-rail active-surface' : 'recipe-rail wide-collection-context'}
          aria-label="Recipe index"
          role="region"
          data-mobile-state={view === 'collection' ? 'active' : 'inactive'}
        >
          <div className="search-wrap">
            <Search size={18} aria-hidden="true" />
            <label className="sr-only" htmlFor="recipe-search">
              Search recipes
            </label>
            <input
              type="search"
              id="recipe-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes"
              autoComplete="off"
            />
          </div>

          <div className="recipe-index-utility">
            <p>{filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}</p>
            <label>
              <span className="sr-only">Sort recipes</span>
              <select
                aria-label="Sort recipes"
                value={recipeSort}
                onChange={(event) => setRecipeSort(event.target.value as RecipeSort)}
              >
                <option value="alphabetical">Alphabetical</option>
                <option value="recent">Recently modified</option>
              </select>
            </label>
          </div>

          <RecipeList
            listRef={recipeListRef}
            recipes={filteredRecipes}
            totalRecipeCount={recipes.length}
            isLoading={isBootstrapping}
            selectedId={selectedRecipe?.id}
            onCreate={startNewRecipe}
            onSelect={(recipe) => {
              if (view === 'collection') {
                rememberCollectionScroll();
              }
              setSelectedId(recipe.id);
              setEditingRecipe(null);
              setPendingDeleteId('');
              setView('detail');
            }}
          />
        </aside>

        <section
          className="desktop-preview-pane"
          role="region"
          aria-label="Recipe preview"
          aria-busy={isBootstrapping && (view === 'collection' || view === 'detail')}
          data-pane-content={view === 'settings' ? 'settings' : view === 'editor' ? 'editor' : 'preview'}
          data-mobile-state={view === 'collection' ? 'inactive' : 'active'}
        >
          {view === 'settings' ? (
            <SettingsPanel
              cookbook={cookbook}
              authEmail={authEmail}
              inviteCode={inviteCode}
              recipes={recipes}
              syncState={syncState}
              statusMessage={statusMessage}
              tags={tags}
              selectedTags={selectedTags}
              favoritesOnly={favoritesOnly}
              initialSection={settingsTarget}
              onAuthEmailChange={setAuthEmail}
              onInviteCodeChange={setInviteCode}
              onMagicLink={submitMagicLink}
              onInvite={submitInvite}
              onImportMarkdown={(value) => void importMarkdown(value)}
              onRefresh={() => void refreshRecipes()}
              onToggleTag={toggleTag}
              onToggleFavorites={() => setFavoritesOnly((value) => !value)}
              onSignOut={() => void signOut()}
              backLabel={settingsReturnView === 'detail' ? 'Back to recipe' : settingsReturnView === 'editor' ? 'Back to editor' : 'Back to recipes'}
              onBack={() => {
                if (settingsReturnView === 'detail' && detailFilterSnapshot.current) {
                  setSelectedTags(detailFilterSnapshot.current.selectedTags);
                  setFavoritesOnly(detailFilterSnapshot.current.favoritesOnly);
                }
                preserveSelectionOnSettingsReturn.current = settingsReturnView === 'detail';
                setView(settingsReturnView);
              }}
            />
          ) : null}
          {(view === 'editor' || (view === 'settings' && settingsReturnView === 'editor')) && editingRecipe ? (
            <RecipeEditor
              inactive={view !== 'editor'}
              recipe={editingRecipe}
              onCancel={() => {
                setEditingRecipe(null);
                setView(editorReturnView);
              }}
              onSave={(recipe) => {
                setPendingDeleteId('');
                void persistRecipe(recipe, editorReturnView);
              }}
            />
          ) : null}
          {isBootstrapping && (view === 'collection' || view === 'detail') ? (
            <PreviewSkeleton />
          ) : (view === 'collection' || view === 'detail') && selectedRecipe ? (
            <RecipeDetail
              recipe={selectedRecipe}
              showBack={view === 'detail'}
              onBack={() => setView('collection')}
              checkedIngredientIndexes={ingredientChecks[selectedRecipe.id] ?? []}
              onEdit={() => {
                setEditingRecipe(selectedRecipe);
                setEditorReturnView(view === 'collection' ? 'collection' : 'detail');
                setView('editor');
              }}
              deleteNeedsConfirmation={pendingDeleteId === selectedRecipe.id}
              onDelete={() => requestDelete(selectedRecipe)}
              onCancelDelete={() => setPendingDeleteId('')}
              onFavorite={() => toggleFavorite(selectedRecipe)}
              onToggleIngredient={(ingredientIndex) => toggleIngredient(selectedRecipe.id, ingredientIndex)}
              onResetIngredients={() => resetIngredients(selectedRecipe.id)}
            />
          ) : view === 'collection' || view === 'detail' ? (
            <EmptyDetail onCreate={startNewRecipe} />
          ) : null}
        </section>
      </main>

      {addSurface !== 'closed' ? (
        <AddRecipeDialog
          surface={addSurface}
          availability={getRecipeImportAvailability()}
          recipeUrl={recipeUrl}
          error={recipeUrlError}
          isImporting={isImportingRecipe}
          onRecipeUrlChange={(value) => {
            setRecipeUrl(value);
            setRecipeUrlError('');
          }}
          onManualCreate={() => {
            setAddSurface('closed');
            startNewRecipe();
          }}
          onShowUrl={() => setAddSurface('url')}
          onBack={backToAddChoices}
          onCancel={closeAddMenu}
          onSubmit={submitRecipeUrl}
        />
      ) : null}

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

function AddRecipeDialog({
  surface,
  availability,
  recipeUrl,
  error,
  isImporting,
  onRecipeUrlChange,
  onManualCreate,
  onShowUrl,
  onBack,
  onCancel,
  onSubmit
}: {
  surface: Exclude<AddSurface, 'closed'>;
  availability: ReturnType<typeof getRecipeImportAvailability>;
  recipeUrl: string;
  error: string;
  isImporting: boolean;
  onRecipeUrlChange: (value: string) => void;
  onManualCreate: () => void;
  onShowUrl: () => void;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="add-dialog-layer" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="add-dialog" role="dialog" aria-modal="true" aria-labelledby="add-dialog-title">
        {surface === 'choices' ? (
          <>
            <div className="add-dialog-heading">
              <h2 id="add-dialog-title">Add recipe</h2>
              <button type="button" className="icon-button desktop-dialog-close" onClick={onCancel} aria-label="Close add recipe menu"><X size={18} /></button>
            </div>
            <div className="add-choice-list">
              <button type="button" className="add-choice" onClick={onManualCreate} aria-label="Create manually">
                <Plus size={19} aria-hidden="true" />
                <span><strong>Create manually</strong><small>Start with an empty recipe</small></span>
              </button>
              <button type="button" className="add-choice" onClick={onShowUrl} disabled={!availability.available} aria-label="Import from URL">
                <Upload size={19} aria-hidden="true" />
                <span><strong>Import from URL</strong><small>Fill a recipe from a public link</small></span>
              </button>
            </div>
            {!availability.available ? <p className="add-dialog-note">{availability.reason}</p> : null}
            <button type="button" className="button add-dialog-cancel" onClick={onCancel}>Cancel</button>
          </>
        ) : (
          <>
            <div className="add-dialog-heading">
              <button type="button" className="icon-button add-dialog-back" onClick={onBack} aria-label="Back to add options" disabled={isImporting}><ChevronLeft size={20} /></button>
              <h2 id="add-dialog-title">Import from URL</h2>
              <button type="button" className="icon-button" onClick={onCancel} aria-label="Close URL import" disabled={isImporting}><X size={18} /></button>
            </div>
            <form className="url-import-form" onSubmit={onSubmit} noValidate>
              <label htmlFor="recipe-import-url">Recipe URL</label>
              <input
                id="recipe-import-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="https://example.com/recipe"
                value={recipeUrl}
                disabled={isImporting}
                aria-describedby={error ? 'recipe-import-error' : undefined}
                aria-invalid={Boolean(error)}
                onChange={(event) => onRecipeUrlChange(event.target.value)}
                autoFocus
              />
              {error ? <p id="recipe-import-error" className="url-import-error" role="alert">{error}</p> : null}
              <div className="form-actions">
                <button type="button" className="button" onClick={onCancel} disabled={isImporting}>Cancel</button>
                <button type="submit" className="button primary" disabled={isImporting || !recipeUrl.trim()} aria-label={isImporting ? 'Importing recipe' : 'Import recipe'}>
                  {isImporting ? 'Importing...' : 'Import recipe'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export function LibraryNavigation({
  isLoading,
  recipeCount,
  favoriteCount,
  tags,
  tagCounts,
  favoritesOnly,
  selectedTags,
  onHome,
  onAllRecipes,
  onFavorites,
  onToggleTag,
  onCreate,
  onImportExport,
  onSettings
}: {
  isLoading: boolean;
  recipeCount: number;
  favoriteCount: number;
  tags: string[];
  tagCounts: Record<string, number>;
  favoritesOnly: boolean;
  selectedTags: string[];
  onHome: () => void;
  onAllRecipes: () => void;
  onFavorites: () => void;
  onToggleTag: (tag: string) => void;
  onCreate: () => void;
  onImportExport: () => void;
  onSettings: () => void;
}) {
  const allRecipesActive = !favoritesOnly && selectedTags.length === 0;

  return (
    <nav className="library-navigation" aria-label="Library navigation">
      <button type="button" className="library-identity" aria-label="Recipe Box home" onClick={onHome}>
        <span className="brand-mark" aria-hidden="true"><Archive size={20} /></span>
        <span>Recipe Box</span>
      </button>

      <div className="library-primary-navigation">
        <button
          type="button"
          className={allRecipesActive ? 'library-navigation-row active' : 'library-navigation-row'}
          aria-label={isLoading ? 'All Recipes, loading' : `All Recipes, ${recipeCount} recipes`}
          aria-current={allRecipesActive ? 'page' : undefined}
          onClick={onAllRecipes}
        >
          <BookOpen size={17} aria-hidden="true" />
          <span>All Recipes</span>
          {isLoading ? <span className="navigation-count-skeleton" data-testid="navigation-count-skeleton" aria-hidden="true" /> : <span aria-hidden="true">{recipeCount}</span>}
        </button>
        <button
          type="button"
          className={favoritesOnly ? 'library-navigation-row active' : 'library-navigation-row'}
          aria-label={isLoading ? 'Browse favorites, loading' : `Browse favorites, ${favoriteCount} recipes`}
          aria-pressed={favoritesOnly}
          onClick={onFavorites}
        >
          <Heart size={17} aria-hidden="true" />
          <span>Favorites</span>
          {isLoading ? <span className="navigation-count-skeleton" data-testid="navigation-count-skeleton" aria-hidden="true" /> : <span aria-hidden="true">{favoriteCount}</span>}
        </button>
      </div>

      <div className="library-tags" role="group" aria-label="Recipe tags">
        <p>Tags</p>
        {tags.map((tag) => {
          const selected = selectedTags.includes(tag);
          return (
            <button
              type="button"
              key={tag}
              className={selected ? 'library-navigation-row active' : 'library-navigation-row'}
              aria-label={`Tag ${tag}, ${tagCounts[tag] ?? 0} recipes`}
              aria-pressed={selected}
              onClick={() => onToggleTag(tag)}
            >
              <span>{tag}</span>
              <span aria-hidden="true">{tagCounts[tag] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="library-management-navigation">
        <button type="button" className="library-navigation-row" onClick={onCreate}>
          <Plus size={17} aria-hidden="true" /> <span>Create Recipe</span>
        </button>
        <button type="button" className="library-navigation-row" onClick={onImportExport}>
          <Download size={17} aria-hidden="true" /> <span>Import/Export</span>
        </button>
        <button type="button" className="library-navigation-row" onClick={onSettings}>
          <Settings size={17} aria-hidden="true" /> <span>Settings</span>
        </button>
      </div>
    </nav>
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

export function RecipeList({
  listRef,
  recipes,
  totalRecipeCount,
  isLoading,
  selectedId,
  onCreate,
  onSelect
}: {
  listRef: RefObject<HTMLUListElement | null>;
  recipes: Recipe[];
  totalRecipeCount: number;
  isLoading: boolean;
  selectedId?: string;
  onCreate: () => void;
  onSelect: (recipe: Recipe) => void;
}) {
  if (isLoading) {
    return (
      <ul ref={listRef} className="recipe-list" aria-label="Loading recipes" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <li key={index} data-testid="recipe-row-skeleton" aria-hidden="true">
            <div className="recipe-row recipe-row-skeleton">
              <span className="recipe-title-skeleton" />
              <span className="recipe-thumbnail recipe-thumbnail-skeleton" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (!recipes.length) {
    if (totalRecipeCount === 0) {
      return (
        <div className="empty-list">
          <p>No recipes saved yet.</p>
          <button type="button" className="button primary" onClick={onCreate}>
            <Plus size={17} /> Create recipe
          </button>
        </div>
      );
    }

    return (
      <div className="empty-list">
        <p>No recipes match your search or filters.</p>
      </div>
    );
  }

  return (
    <ul ref={listRef} className="recipe-list" aria-label="Recipes">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <button
            type="button"
            className={selectedId === recipe.id ? 'recipe-row selected' : 'recipe-row'}
            onClick={() => onSelect(recipe)}
            aria-label={`Open ${recipe.title}`}
          >
            <span className="recipe-row-copy">
              <span className="recipe-title">{recipe.title}</span>
              <span className="recipe-row-metadata desktop-only">
                <span>{recipe.sourceLabel || 'Personal recipe'}</span>
                <span>Modified {formatModifiedDate(recipe.updatedAt)}</span>
              </span>
            </span>
            <RecipeThumbnail recipe={recipe} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatModifiedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'date unknown';
  }
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

export function RecipeThumbnail({ recipe }: { recipe: Recipe }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [recipe.imageUrl]);

  if (recipe.imageUrl && !imageFailed) {
    return (
      <img
        className="recipe-thumbnail"
        src={recipe.imageUrl}
        alt=""
        loading="lazy"
        width="56"
        height="56"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className="recipe-thumbnail placeholder"
      data-testid="recipe-thumbnail-placeholder"
      aria-hidden="true"
      style={{ width: 56, height: 56, flex: '0 0 56px' }}
    >
      <BookOpen size={22} strokeWidth={1.75} />
    </span>
  );
}

function RecipeDetail({
  recipe,
  showBack,
  onBack,
  checkedIngredientIndexes,
  onEdit,
  onDelete,
  onCancelDelete,
  onFavorite,
  onToggleIngredient,
  onResetIngredients,
  deleteNeedsConfirmation
}: {
  recipe: Recipe;
  showBack: boolean;
  onBack: () => void;
  checkedIngredientIndexes: number[];
  onEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  onFavorite: () => void;
  onToggleIngredient: (ingredientIndex: number) => void;
  onResetIngredients: () => void;
  deleteNeedsConfirmation: boolean;
}) {
  const checkedIngredients = new Set(checkedIngredientIndexes);
  const appliedCount = recipe.ingredients.filter((_, index) => checkedIngredients.has(index)).length;

  return (
    <article className="recipe-detail active-surface" id="recipe-detail">
      {showBack ? (
        <button type="button" className="text-button screen-back" onClick={onBack}>
          <ChevronLeft size={18} /> Back to recipes
        </button>
      ) : null}
      <div className="detail-head">
        <div>
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
          {deleteNeedsConfirmation ? (
            <button type="button" className="button subtle" onClick={onCancelDelete}>
              Keep recipe
            </button>
          ) : null}
          <button
            type="button"
            className={deleteNeedsConfirmation ? 'button danger active-danger' : 'button danger'}
            onClick={onDelete}
            aria-describedby={deleteNeedsConfirmation ? 'delete-confirmation-note' : undefined}
          >
            <Trash2 size={17} /> {deleteNeedsConfirmation ? 'Confirm delete' : 'Delete'}
          </button>
        </div>
      </div>

      {deleteNeedsConfirmation ? (
        <p id="delete-confirmation-note" className="inline-warning" role="status">
          This removes the recipe from this household. Undo is available right after deletion.
        </p>
      ) : null}

      {recipe.sourceUrl ? (
        <a className="source-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
          View source: {recipe.sourceLabel || recipe.sourceUrl}
        </a>
      ) : recipe.sourceLabel ? <p className="source-context">Source: {recipe.sourceLabel}</p> : null}

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
          {recipe.ingredients.length ? <ul className="ingredient-checklist">
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
          </ul> : (
            <div className="empty-section">
              <p>No ingredients saved yet.</p>
              <button type="button" className="button subtle" onClick={onEdit}>
                <Edit3 size={16} /> Add ingredients
              </button>
            </div>
          )}
        </section>

        <section className="direction-panel" aria-labelledby="directions-heading">
          <h3 id="directions-heading">Directions</h3>
          {recipe.directions.length ? (
            <ol>
              {recipe.directions.map((direction, index) => (
                <li key={`${direction}-${index}`}>{direction}</li>
              ))}
            </ol>
          ) : (
            <div className="empty-section">
              <p>No directions saved yet.</p>
              <button type="button" className="button subtle" onClick={onEdit}>
                <Edit3 size={16} /> Add directions
              </button>
            </div>
          )}
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
  inactive,
  onCancel,
  onSave
}: {
  recipe: Recipe;
  inactive: boolean;
  onCancel: () => void;
  onSave: (recipe: Recipe) => void;
}) {
  const [draft, setDraft] = useState(recipeToDraft(recipe));

  useEffect(() => {
    if (inactive) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inactive, onCancel]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave({
      ...recipe,
      id: recipe.id || createLocalRecipeId(),
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
    <section className="editor-surface active-surface" aria-labelledby="editor-heading" hidden={inactive}>
      <div className="detail-head">
        <div>
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
            Cancel
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
  syncState,
  statusMessage,
  tags,
  selectedTags,
  favoritesOnly,
  initialSection,
  onAuthEmailChange,
  onInviteCodeChange,
  onMagicLink,
  onInvite,
  onImportMarkdown,
  onRefresh,
  onToggleTag,
  onToggleFavorites,
  onSignOut,
  backLabel,
  onBack
}: {
  cookbook: Cookbook | null;
  authEmail: string;
  inviteCode: string;
  recipes: Recipe[];
  syncState: SyncState;
  statusMessage: string;
  tags: string[];
  selectedTags: string[];
  favoritesOnly: boolean;
  initialSection: 'overview' | 'data';
  onAuthEmailChange: (value: string) => void;
  onInviteCodeChange: (value: string) => void;
  onMagicLink: (event: FormEvent<HTMLFormElement>) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onImportMarkdown: (markdown: string) => void;
  onRefresh: () => void;
  onToggleTag: (tag: string) => void;
  onToggleFavorites: () => void;
  onSignOut: () => void;
  backLabel: string;
  onBack: () => void;
}) {
  const [markdown, setMarkdown] = useState('');
  const cloudReady = hasSupabaseConfig;
  const overviewRef = useRef<HTMLElement | null>(null);
  const dataSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = initialSection === 'data' ? dataSectionRef.current : overviewRef.current;
    target?.scrollIntoView({ block: 'start' });
  }, [initialSection]);

  return (
    <section className="settings-surface" aria-labelledby="settings-heading" ref={overviewRef}>
      <button type="button" className="text-button screen-back settings-contextual-back" onClick={onBack}>
        <ChevronLeft size={18} /> {backLabel}
      </button>
      <div className="detail-head">
        <div>
          <h2 id="settings-heading">{cookbook?.name ?? 'Recipe Box'}</h2>
        </div>
        <Home className="settings-home" size={28} aria-hidden="true" />
      </div>

      <div className="settings-grid">
        <section className="settings-section">
          <h3>Recipe filters</h3>
          <div role="group" aria-label="Recipe filters">
            <div className="rail-toolbar">
              <button
                type="button"
                className={favoritesOnly ? 'chip selected' : 'chip'}
                aria-pressed={favoritesOnly}
                onClick={onToggleFavorites}
              >
                <Heart size={15} /> Favorites
              </button>
            </div>
            <div className="tag-strip" aria-label="Tags">
              {tags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={selectedTags.includes(tag) ? 'tag selected' : 'tag'}
                  aria-pressed={selectedTags.includes(tag)}
                  onClick={() => onToggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Sync</h3>
          <SyncBadge state={syncState} message={statusMessage} />
          <button type="button" className="button subtle" onClick={onRefresh}>
            <RefreshCcw size={16} /> Sync now
          </button>
        </section>

        <section className="settings-section">
          <h3>Supabase</h3>
          {hasSupabaseConfig ? (
            <p className="settings-copy">Connected with browser-safe credentials.</p>
          ) : (
            <p className="settings-copy">Add Supabase values in `.env.local`, then restart the app to turn on cloud sync.</p>
          )}
          <form onSubmit={onMagicLink} className="compact-form">
            <label>
              Email
              <input
                type="email"
                value={authEmail}
                onChange={(event) => onAuthEmailChange(event.target.value)}
                placeholder="cook@example.com"
                disabled={!cloudReady}
              />
            </label>
            <button type="submit" className="button primary" disabled={!cloudReady}>
              <Send size={16} /> Send magic link
            </button>
          </form>
          <button type="button" className="button subtle" onClick={onSignOut} disabled={!cloudReady}>
            <LogOut size={16} /> Sign out
          </button>
        </section>

        <section className="settings-section">
          <h3>Invite</h3>
          <p className="invite-code">{cookbook?.inviteCode ?? 'LOCAL'}</p>
          <form onSubmit={onInvite} className="compact-form">
            <label>
              Join code
              <input value={inviteCode} onChange={(event) => onInviteCodeChange(event.target.value)} disabled={!cloudReady} />
            </label>
            <button type="submit" className="button subtle" disabled={!cloudReady}>
              Join household
            </button>
          </form>
        </section>

        <div className="settings-data-management" role="region" aria-label="Data management" ref={dataSectionRef}>
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

function PreviewSkeleton() {
  return (
    <div className="recipe-preview-skeleton" data-testid="recipe-preview-skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
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

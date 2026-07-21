# Mobile Recipe Index Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing card-heavy Recipe Box shell with the approved title-led, iOS-first recipe index while preserving search, offline data, editing, settings, and recipe use.

**Architecture:** Keep the existing React state and service layer, but reshape the app into explicit collection, detail, editor, and settings screens on mobile. Extend the recipe domain model to carry the database's existing optional image URL, render a stable thumbnail component for both real and missing images, and replace the current CSS system with mobile-first tokens and layouts from `DESIGN.md`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Lucide React, Dexie, Supabase, CSS with OKLCH tokens.

---

### Task 1: Carry Optional Recipe Images Through the Data Model

**Files:**

- Modify: `src/lib/types.ts`
- Modify: `src/lib/supabaseMapping.ts`
- Modify: `src/lib/markdown.ts`
- Modify: `src/App.tsx`
- Test: `src/lib/supabaseMapping.test.ts`
- Test: `src/lib/markdown.test.ts`

**Step 1: Write failing mapping tests**

Add tests proving that `fromRecipeRow` maps `image_url` to `imageUrl`, `toRecipeInsert` maps it back, and Markdown imports produce an empty image URL.

```ts
expect(fromRecipeRow({ ...row, image_url: 'https://example.com/pizza.jpg' }).imageUrl)
  .toBe('https://example.com/pizza.jpg');

expect(toRecipeInsert({ ...recipe, imageUrl: 'https://example.com/pizza.jpg' }, 'cookbook-1').image_url)
  .toBe('https://example.com/pizza.jpg');

expect(parseRecipeMarkdown('# Toast').imageUrl).toBe('');
```

**Step 2: Run the focused tests and confirm failure**

Run: `npm test -- src/lib/supabaseMapping.test.ts src/lib/markdown.test.ts`

Expected: FAIL because `Recipe` has no `imageUrl` field and mapping omits it.

**Step 3: Add the minimal domain mapping**

Add `imageUrl: string` to `Recipe`. Map `image_url` in both Supabase mapping directions. Initialize `imageUrl: ''` in `parseRecipeMarkdown` and `BLANK_RECIPE`.

```ts
export type Recipe = {
  id: string;
  cookbookId?: string;
  title: string;
  imageUrl: string;
  // existing fields remain unchanged
};
```

Do not add image upload or editing in this redesign. The schema already accepts externally supplied URLs; upload is separate scope.

**Step 4: Run tests and typecheck**

Run: `npm test -- src/lib/supabaseMapping.test.ts src/lib/markdown.test.ts && npm run typecheck`

Expected: PASS.

**Step 5: Regenerate seed data if the type change requires it**

Update `scripts/generate-seed-recipes.mjs` so generated recipes include `imageUrl: ''`, then run `npm run generate:seed`.

Expected: every seeded recipe has an explicit empty image URL and TypeScript remains valid.

**Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/supabaseMapping.ts src/lib/markdown.ts src/App.tsx scripts/generate-seed-recipes.mjs src/data/seedRecipes.ts src/lib/supabaseMapping.test.ts src/lib/markdown.test.ts
git commit -m "feat: carry recipe image urls through the data model"
```

### Task 2: Build the Title-Led Recipe Index

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `public/favicon.svg`
- Modify: `public/apple-touch-icon.svg`
- Modify: `public/pwa-icon.svg`

**Step 1: Write failing home-screen structure tests**

Update the app-shell tests to require the approved opening sequence and simplified rows.

```ts
it('shows identity, search, and title-led recipe rows', async () => {
  render(<App />);

  const heading = await screen.findByRole('heading', { name: 'Recipe Box' });
  const search = screen.getByRole('searchbox', { name: 'Search recipes' });
  const list = screen.getByRole('list', { name: 'Recipes' });

  expect(heading.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(search.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  const row = within(list).getByRole('button', { name: /Open Baguette/i });
  expect(within(row).getByText('Baguette')).toBeInTheDocument();
  expect(within(row).getByTestId('recipe-thumbnail-placeholder')).toBeInTheDocument();
});
```

Add a fixture-level test for a valid image URL and assert a real `<img>` is used. Test that row metadata, tags, and favorite controls are absent from the collection list.

**Step 2: Run the focused test and confirm failure**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the current home screen includes household labeling, filter chips, tags, metadata, favorites, and no thumbnail slot.

**Step 3: Reshape the header and collection markup**

In `App.tsx`:

- Replace the current left-aligned household lockup with a compact centered logo and `Recipe Box` name.
- Keep add and settings as quiet 44px icon actions.
- Keep sync status available inside settings or as a non-competing transient status, not in the primary home header.
- Remove favorite and tag filtering controls from the initial screen.
- Keep search immediately beneath identity.
- Keep all filtered recipes in a single semantic list.
- Sort the visible collection alphabetically by title before rendering.

Do not remove favorite, tag, sync, import, export, or settings capabilities from the application. Move access to detail or settings where appropriate.

**Step 4: Introduce a stable thumbnail component**

Add a local `RecipeThumbnail` component in `App.tsx`.

```tsx
function RecipeThumbnail({ recipe }: { recipe: Recipe }) {
  if (recipe.imageUrl) {
    return <img className="recipe-thumbnail" src={recipe.imageUrl} alt="" loading="lazy" />;
  }

  return (
    <span className="recipe-thumbnail placeholder" data-testid="recipe-thumbnail-placeholder" aria-hidden="true">
      <BookOpen size={22} strokeWidth={1.75} />
    </span>
  );
}
```

The empty alt text is deliberate because the title already labels the row. Keep the placeholder geometry identical to a real image.

**Step 5: Simplify each recipe row**

Each row button contains only the title and `RecipeThumbnail`. The button remains the complete tap target. Remove `getRecipeSummary`, tags, and the adjacent favorite button from the list markup.

**Step 6: Refresh the app icon family**

Redraw the existing SVG icon family as a precise, flat recipe-index mark using the new warm neutral and deep-red palette. Keep the mark simple enough to read at favicon size. Do not use gradients, shadows, kitchen clip art, or extra badge elements.

**Step 7: Run the focused test**

Run: `npm test -- src/App.test.tsx`

Expected: PASS for opening sequence, search, row content, and placeholder behavior.

**Step 8: Commit**

```bash
git add src/App.tsx src/App.test.tsx public/favicon.svg public/apple-touch-icon.svg public/pwa-icon.svg
git commit -m "feat: add the title-led mobile recipe index"
```

### Task 3: Add Mobile Screen Navigation Without Losing Context

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Write failing mobile navigation tests**

Test that the collection is initially visible, selecting a recipe opens detail, detail exposes a `Back to recipes` control, and returning preserves the active search query.

```ts
it('returns from detail without clearing search', async () => {
  render(<App />);
  await screen.findByText(/Offline ready/i);

  await userEvent.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'pizza');
  await userEvent.click(screen.getByRole('button', { name: /Open NYC Pizza/i }));
  await userEvent.click(screen.getByRole('button', { name: 'Back to recipes' }));

  expect(screen.getByRole('searchbox', { name: 'Search recipes' })).toHaveValue('pizza');
  expect(screen.getByRole('list', { name: 'Recipes' })).toBeInTheDocument();
});
```

**Step 2: Run the test and confirm failure**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the current responsive layout displays detail and a truncated list together and has no explicit back navigation.

**Step 3: Model the active surface explicitly**

Replace the current implicit `selectedRecipe` rendering behavior with a small view state such as:

```ts
type AppView = 'collection' | 'detail' | 'editor' | 'settings';
const [view, setView] = useState<AppView>('collection');
```

Selecting a row sets the recipe ID and opens `detail`. Back returns to `collection`. Editing and settings open their own surfaces and provide standard back or cancel behavior. Do not clear `query` or reconstruct the recipe list on navigation.

**Step 4: Preserve desktop enhancement**

Keep DOM semantics compatible with an optional wide two-pane layout, but make a dedicated single surface canonical below the desktop breakpoint. Do not use JavaScript viewport detection for layout.

**Step 5: Run app tests**

Run: `npm test -- src/App.test.tsx`

Expected: PASS, including existing ingredient, delete-confirmation, empty-directions, and settings tests after their navigation steps are updated.

**Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: add mobile-first recipe screen navigation"
```

### Task 4: Replace the Visual System With the iOS-First Design

**Files:**

- Modify: `src/styles.css`
- Modify: `src/App.tsx`

**Step 1: Establish the new tokens**

Replace the coral, butter, mint, card-shadow, and large-radius system with the exact OKLCH roles from `DESIGN.md`: canvas, primary text, secondary text, separator, search surface, placeholder surface, placeholder icon, accent, and destructive.

Use the iOS system font stack. Keep fixed type sizes rather than fluid display sizing.

**Step 2: Build the mobile composition first**

Base styles at 320px and above must:

- Respect top, bottom, and horizontal safe areas.
- Use 16px horizontal insets.
- Keep the logo and name compact and centered.
- Place search directly beneath identity.
- Render the recipe list without an outer card, shadow, or ornamental background.
- Give rows at least 80px height with a 56px trailing thumbnail.
- Clamp titles to two lines.
- Use one-pixel separators instead of gaps between cards.
- Maintain 44px minimum tap targets for navigation actions.

**Step 3: Restyle detail, editor, and settings as related screens**

Remove eyebrow labels, large display headings, nested rounded panels, yellow ingredient cards, decorative status pills, and floating surface shadows. Preserve information and behavior, but use native section hierarchy, separators, grouped form fields where helpful, and the same icon vocabulary as the collection.

**Step 4: Add responsive enhancement**

At a deliberate wide breakpoint, permit a bounded collection column and adjacent detail. Keep collection rows title-led. Do not switch to a photo grid. Ensure editor and settings remain comfortably readable and do not inherit a narrow sidebar width.

**Step 5: Add interaction and reduced-motion states**

Use only opacity and transform transitions between 150ms and 220ms. Provide active press feedback suitable for touch, visible keyboard focus, image loading containment, and the existing reduced-motion override.

**Step 6: Run automated verification**

Run: `npm test && npm run typecheck && npm run build`

Expected: all tests pass, TypeScript reports no errors, and Vite produces a successful production build.

**Step 7: Commit**

```bash
git add src/styles.css src/App.tsx
git commit -m "style: apply the ios-first recipe index system"
```

### Task 5: Perform Mobile Visual Verification and Final Polish

**Files:**

- Modify as needed: `src/App.tsx`
- Modify as needed: `src/styles.css`
- Modify as needed: `src/App.test.tsx`

**Step 1: Start the app**

Run: `npm run dev`

Expected: Vite serves the application without console errors.

**Step 2: Verify the canonical phone widths**

Use the browser at 320x568 and 390x844. Inspect:

- Logo, name, search, and recipes appear in the approved order.
- The first recipe is visible without a large decorative header consuming the viewport.
- Every row has stable thumbnail geometry.
- Missing-photo placeholders are quieter than real images.
- Long recipe titles clamp cleanly without colliding with thumbnails.
- Search remains usable with the software keyboard-sized viewport.
- Detail is a dedicated screen and back restores search context.
- Safe areas and bottom actions do not collide with device edges.

**Step 3: Verify tablet and desktop adaptation**

Inspect 768x1024 and 1440x900. Confirm the title-led collection remains intact and any two-pane enhancement does not reintroduce the old dashboard/card appearance.

**Step 4: Run the anti-slop inspection**

Compare the rendered app against `DESIGN.md`. Remove any remaining eyebrow labels, gratuitous pills, repeated cards, gradients, oversized radii, decorative shadows, arbitrary color, or filler copy. Confirm Paprika influenced only workflow directness, not the visual styling.

**Step 5: Re-run the full quality gate**

Run: `npm test && npm run typecheck && npm run build && git diff --check`

Expected: all commands pass with no whitespace errors.

**Step 6: Commit final polish**

```bash
git add src/App.tsx src/styles.css src/App.test.tsx
git commit -m "fix: polish responsive recipe index details"
```

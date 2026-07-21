# Desktop Cookbook Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a desktop-native cookbook management workspace with persistent navigation, a searchable recipe index, and a read-only preview while preserving the approved mobile and tablet experiences.

**Architecture:** Keep the existing recipe state and service layer. Add desktop-only structural regions that remain co-mounted above a content-driven 1180px breakpoint, and reuse the existing detail, editor, settings, search, filtering, and thumbnail components inside them. CSS owns device adaptation; React must not branch on viewport width.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Lucide React, CSS Grid, OKLCH tokens.

---

### Task 1: Add Desktop Library Navigation and Filter State

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Write failing structure and behavior tests**

Add tests for a persistent `Library navigation` region containing:

- Recipe Box home control.
- All Recipes and Favorites controls with counts.
- Tag controls.
- Create Recipe, Import/Export, and Settings destinations.

Test that Favorites and tag navigation update the central recipe index, All Recipes clears those filters, and selecting navigation does not reset the search query unnecessarily.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because no library navigation component exists.

**Step 3: Implement a reusable LibraryNavigation component**

Add a `LibraryNavigation` component that receives current counts, active filter state, tags, and callbacks. Render it alongside the existing app surfaces so CSS can make it persistent only at desktop widths. Do not use JavaScript viewport detection.

Keep the existing mobile top bar. The desktop navigation may contain equivalent actions because CSS will select the correct context.

**Step 4: Wire navigation behavior**

- `All Recipes` clears favorites and selected tags, then returns to the collection/preview workspace.
- `Favorites` toggles or selects favorite-only browsing.
- Tag controls keep the existing multi-tag filtering semantics.
- Settings opens the existing settings surface.
- Import/Export opens settings at its data-management section without duplicating import/export logic.
- Create Recipe uses the existing safe local-ID path.

**Step 5: Verify GREEN**

Run: `npm test -- src/App.test.tsx && npm run typecheck`

Expected: focused tests and typecheck pass.

**Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: add desktop cookbook navigation"
```

### Task 2: Build the Desktop Recipe Index and Persistent Preview

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Write failing desktop-workspace tests**

Test DOM structure that CSS can expose as three persistent regions without viewport JavaScript:

- Library navigation.
- Recipe index.
- Read-only preview.

Add tests for result count, alphabetical/recent sort, source/modified supporting metadata, selection updating the preview, and editor replacing preview content while navigation/index stay mounted.

**Step 2: Verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the list has no desktop utility row, sort state, or supporting metadata, and editor/settings replace the entire workspace.

**Step 3: Add sort state and desktop list content**

Add `RecipeSort = 'alphabetical' | 'recent'`, defaulting to alphabetical. Derive filtered and sorted recipes without mutating source arrays.

Extend recipe rows with a desktop-only metadata wrapper containing source label and formatted modified date. Keep mobile rows title-and-thumbnail only through CSS, not duplicate markup.

Add a utility row with result count and a native select or compact segmented control for sort. Do not add filter chips above search.

**Step 4: Keep management regions co-mounted**

Refactor the workspace so desktop CSS can keep navigation and index mounted while preview, editor, or settings occupies the right region. Mobile CSS must still show only the active surface. Preserve selected recipe, query, filters, editor drafts, list scroll, and detail scroll behavior.

**Step 5: Keep preview read-only by default**

Selecting a recipe updates the existing `RecipeDetail` preview. Edit replaces the preview pane with `RecipeEditor`; cancel returns to the same recipe. Settings uses the right pane on desktop and returns to its origin.

**Step 6: Verify GREEN**

Run: `npm test -- src/App.test.tsx && npm test && npm run typecheck && npm run build`

Expected: all checks pass.

**Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: add persistent desktop recipe preview"
```

### Task 3: Apply the Desktop Cookbook Library Visual System

**Files:**

- Modify: `src/styles.css`
- Modify if structurally required: `src/App.tsx`

**Step 1: Add the desktop shell at 1180px**

Create a desktop breakpoint with a capped application width and three columns:

```css
@media (min-width: 1180px) {
  .app-shell { /* viewport-height management shell */ }
  .desktop-workspace {
    display: grid;
    grid-template-columns: 232px minmax(360px, 400px) minmax(0, 1fr);
  }
}
```

Use thin separators between regions. Do not wrap the regions in cards or add shadows.

**Step 2: Style library navigation**

Integrate product identity at the top, use compact plain navigation rows, allow tags to scroll independently, and pin management destinations near the bottom. Active states use a restrained tonal surface and accent text, not solid pills.

Hide the global mobile top bar only inside the desktop breakpoint. Ensure duplicate contextual controls are not exposed to desktop screen readers when hidden.

**Step 3: Style the management index**

Use an independently scrolling index, compact utility row, 68–76px recipe rows, 48px thumbnails, supporting metadata, hover state, selected state, and visible keyboard focus. Keep the title dominant.

**Step 4: Style the preview/editor/settings pane**

Give the right pane independent scrolling and a readable inner width. Keep preview actions aligned near the title. Use side-by-side ingredients/directions only when the pane itself is wide enough, preferably via a container query. Editor and settings replace preview content without modal treatment.

**Step 5: Preserve mobile and tablet rules**

The new desktop selectors must be scoped to 1180px and above. Existing behavior below that breakpoint remains structurally and visually unchanged.

**Step 6: Run automated checks**

Run: `npm test && npm run typecheck && npm run build && git diff --check`

Expected: all commands pass.

**Step 7: Commit**

```bash
git add src/styles.css src/App.tsx
git commit -m "style: create desktop cookbook library workspace"
```

### Task 4: Verify Desktop Management and Responsive Continuity

**Files:**

- Modify as needed: `src/App.tsx`
- Modify as needed: `src/styles.css`
- Modify as needed: `src/App.test.tsx`

**Step 1: Start the app and inspect canonical desktop widths**

Run: `npm run dev`

Inspect 1180×800, 1440×900, 1728×1117, and 2560×1440. Confirm:

- Navigation, index, and preview are simultaneously useful.
- The app fills the workspace without stretching preview text excessively.
- Navigation and index scroll independently.
- Search, filters, sort, selection, and preview updates work.
- Create, edit/cancel, import/export, settings, favorites, and tags remain reachable.
- Long titles, many tags, absent images, empty states, and loading states remain stable.
- No horizontal overflow.

**Step 2: Verify keyboard and pointer behavior**

Tab through navigation, search, index, and preview actions. Confirm selected and focus states are distinct. Verify hover does not hide required actions and that standard controls remain understandable without hover.

**Step 3: Recheck non-desktop widths**

Inspect 320×568, 390×844, and 768×1024. Confirm the approved mobile top bar, title-led index, dedicated mobile screens, tablet two-pane behavior, and scroll restoration remain unchanged.

**Step 4: Run the anti-slop inspection**

Remove any dashboard widgets, unnecessary cards, gradients, glass effects, oversized radii, floating badges, decorative shadows, or empty hero space. Confirm desktop density serves management rather than visual spectacle.

**Step 5: Run final quality gate**

Run: `npm test && npm run typecheck && npm run build && git diff --check`

Expected: all commands pass with a clean worktree after commit.

**Step 6: Commit polish if required**

```bash
git add src/App.tsx src/styles.css src/App.test.tsx
git commit -m "fix: polish desktop cookbook management"
```

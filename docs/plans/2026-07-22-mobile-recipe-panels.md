# Mobile Recipe Panels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a mobile-only Ingredients/Directions pill toggle with Ingredients-first tap and swipe navigation while preserving the existing wider-screen layout.

**Architecture:** Keep the state local to `RecipeDetail` because panel selection is ephemeral reading UI. Render both semantic tab panels, use CSS below 760px to expose only the active one, and use touch start/end coordinates with a horizontal threshold to translate deliberate swipes into panel changes.

**Tech Stack:** React 19, TypeScript, CSS media queries, Vitest, Testing Library

---

### Task 1: Specify the mobile panel interaction

**Files:**
- Modify: `src/App.test.tsx`

**Step 1: Write the failing tests**

Add focused tests which open a recipe and assert:

```tsx
expect(screen.getByRole('tab', { name: 'Ingredients' })).toHaveAttribute('aria-selected', 'true');
expect(screen.getByRole('tabpanel', { name: 'Ingredients' })).toHaveAttribute('data-active', 'true');
```

Then tap Directions and verify its selected panel, dispatch left and right touch gestures against the panel container, verify short/vertical gestures do nothing, and open another recipe to verify Ingredients is selected again.

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because the tab controls and swipe interaction do not exist.

### Task 2: Implement selection and swipe behavior

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add minimal component state**

Add an `ingredients | directions` state to `RecipeDetail`, initialize it to Ingredients, and reset it when `recipe.id` changes.

**Step 2: Add the accessible toggle and panels**

Render two native buttons with tab semantics and stable IDs. Mark each existing section as a tab panel with `data-active`, leaving its content and ingredient checklist behavior intact.

**Step 3: Add deliberate swipe detection**

Capture the first touch position on `touchstart`. On `touchend`, switch only when horizontal travel is at least 50 pixels and exceeds vertical travel; clear the stored start position after every gesture.

**Step 4: Run the focused tests**

Run: `npm test -- --run src/App.test.tsx`

Expected: PASS.

### Task 3: Add mobile-only presentation

**Files:**
- Modify: `src/styles.css`
- Modify: `src/styles.test.ts`

**Step 1: Write the failing CSS contract test**

Assert that the stylesheet contains the mobile breakpoint rules for the toggle, inactive panel hiding, and a wider-screen rule that hides the toggle.

**Step 2: Run the CSS test to verify it fails**

Run: `npm test -- --run src/styles.test.ts`

Expected: FAIL because the new selectors are absent.

**Step 3: Add the minimal responsive styles**

Style the segmented pill with existing design tokens and 44px targets. Hide it by default; below 760px show it and hide only the inactive tab panel. Preserve the existing `recipe-columns` layout at all wider breakpoints.

**Step 4: Run focused tests**

Run: `npm test -- --run src/styles.test.ts src/App.test.tsx`

Expected: PASS.

### Task 4: Verify the complete change

**Files:**
- Review: `src/App.tsx`
- Review: `src/App.test.tsx`
- Review: `src/styles.css`
- Review: `src/styles.test.ts`

**Step 1: Run the full test suite**

Run: `npm test -- --run`

Expected: all tests pass with no unhandled errors.

**Step 2: Run the production build**

Run: `npm run build`

Expected: exit code 0.

**Step 3: Review the diff**

Run: `git diff --check && git diff -- src/App.tsx src/App.test.tsx src/styles.css src/styles.test.ts docs/plans/2026-07-22-mobile-recipe-panels-design.md docs/plans/2026-07-22-mobile-recipe-panels.md`

Expected: no whitespace errors and only the approved mobile interaction changes.

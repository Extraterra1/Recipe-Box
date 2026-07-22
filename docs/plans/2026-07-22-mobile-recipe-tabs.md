# Mobile Recipe Tabs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a fixed mobile bottom tab bar that switches between all recipes and favorites.

**Architecture:** Reuse the existing `favoritesOnly` collection filter as the single source of truth. Render a small mobile-only navigation component from `App`, and route both tab actions through the existing collection-navigation callbacks so tags, view state, and recipe filtering remain consistent.

**Tech Stack:** React 19, TypeScript, Lucide React, Vitest, Testing Library, CSS media queries

---

### Task 1: Specify mobile recipe tab behavior

**Files:**
- Modify: `src/App.test.tsx`

**Step 1: Write the failing tests**

Add a test that finds the `Recipe views` navigation, verifies `Recipes` is current by default, favorites one recipe, switches to `Favorites`, and confirms only that recipe remains. Then switch to `Recipes` and confirm the full list returns. Add an assertion that switching tabs clears an active tag filter.

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- --run src/App.test.tsx -t "mobile recipe tabs"`

Expected: FAIL because the `Recipe views` navigation does not exist.

### Task 2: Implement the tab bar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Step 1: Write the minimal component**

Add `MobileRecipeTabs` with Recipes and Favorites buttons. Render it from `App`, bind the selected state to `favoritesOnly`, route Recipes through `showAllRecipes`, and make Favorites clear tags, enable the favorites filter, and return to the collection.

**Step 2: Add responsive styling**

Hide the component by default. Below 760px, fix it to the bottom edge, split buttons evenly, respect `env(safe-area-inset-bottom)`, and add matching bottom space to visible app surfaces. Use existing design tokens for all colors and separators.

**Step 3: Run the focused test to verify it passes**

Run: `npm test -- --run src/App.test.tsx -t "mobile recipe tabs"`

Expected: PASS.

### Task 3: Protect responsive presentation and verify

**Files:**
- Modify: `src/styles.test.ts`

**Step 1: Write CSS assertions**

Assert that the tab bar is fixed and visible in the mobile media query, uses safe-area padding, and remains hidden at wider sizes.

**Step 2: Run the stylesheet test**

Run: `npm test -- --run src/styles.test.ts`

Expected: PASS.

**Step 3: Run full verification**

Run: `npm test -- --run src && npm run build`

Expected: all frontend tests pass and the production build exits successfully.

# Collection Selection Highlight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent recipe titles from appearing selected in the collection on initial load or after returning from recipe detail.

**Architecture:** Preserve the existing selected recipe state used by detail and desktop preview. Derive the `RecipeList` visual `selectedId` from the active view so selection styling is only present in detail context.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Collection selection regression

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing tests**

Add one assertion to the collection-load test that no recipe row has the `selected` class. Add one assertion to the detail-return test proving the opened recipe no longer has `selected` after Back.

**Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/App.test.tsx -t "shows identity|returns from detail without clearing"`

Expected: both new assertions fail because the first/current recipe row has `selected`.

**Step 3: Write the minimal implementation**

Pass `selectedId={view === 'detail' ? selectedRecipe?.id : undefined}` to `RecipeList`.

**Step 4: Run focused and full verification**

Run: `npm test -- src/App.test.tsx -t "shows identity|returns from detail without clearing"`

Run: `npm test`

Run: `npm run build`

Expected: all commands exit successfully.

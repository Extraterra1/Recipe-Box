# Default Recently Modified Sort Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make recently modified the default recipe collection ordering while retaining the alphabetical sort option.

**Architecture:** Change only the initial React state for the existing sort control. Reuse the current `sortRecipes` implementation, which already provides newest-first ordering and deterministic title fallback behavior.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Default the recipe index to recently modified

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Change the existing app sorting test to expect the `Sort recipes` combobox to have value `recent` and the first recipe button to be the most recently modified seed recipe.

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/App.test.tsx -t "shows a result count and sorts recipes without mutating the source list"`

Expected: FAIL because the combobox still has value `alphabetical`.

**Step 3: Write the minimal implementation**

Initialize `recipeSort` with `recent` in `App`:

```tsx
const [recipeSort, setRecipeSort] = useState<RecipeSort>('recent');
```

**Step 4: Run focused and full verification**

Run:

```bash
npm test -- src/App.test.tsx -t "shows a result count and sorts recipes without mutating the source list"
npm test
npm run build
```

Expected: all tests pass and the production build exits successfully.

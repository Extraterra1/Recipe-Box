# Recipe URL Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a secure, review-before-save importer for public recipe URLs.

**Architecture:** A Supabase Edge Function fetches and parses bounded recipe HTML into the app's existing recipe draft shape. The React client invokes it only when cloud configuration and network access are available, then routes the normalized draft through the existing editor.

**Tech Stack:** React 19, TypeScript, Vitest, Supabase Edge Functions (Deno), Schema.org Recipe JSON-LD, DOMParser.

---

### Task 1: Recipe parser and fetch boundary

**Files:**
- Create: `supabase/functions/import-recipe/parser.ts`
- Create: `supabase/functions/import-recipe/parser.test.ts`
- Create: `supabase/functions/import-recipe/index.ts`
- Create: `supabase/functions/import-recipe/fixtures/*.html`
- Modify: `supabase/config.toml`

1. Add failing fixture and unit tests for JSON-LD object/array/`@graph`, nested `HowToSection` instructions, ingredient headings, malformed data, Sage Bakes HTML fallback, and both supplied pages.
2. Run the parser tests and confirm they fail because the parser does not exist.
3. Implement normalization into the existing `RecipeDraft` field shape without inventing missing values.
4. Add failing tests for URL validation, redirect revalidation, private/reserved addresses, response size, content type, timeout, and stable errors.
5. Implement the authenticated function handler using current Supabase Edge Function conventions and bounded fetch behavior.
6. Run the parser/function tests, then commit.

### Task 2: Client import service

**Files:**
- Create: `src/lib/recipeImport.ts`
- Create: `src/lib/recipeImport.test.ts`
- Modify: `src/lib/types.ts`

1. Add failing tests for URL normalization, cloud/offline availability, authenticated function invocation, response validation, and stable error mapping.
2. Run the targeted test and confirm the expected failure.
3. Implement the smallest typed client boundary returning a normalized unsaved recipe draft.
4. Run targeted and full library tests, then commit.

### Task 3: Responsive import flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

1. Add failing interaction tests for the add menu, manual creation, URL sheet/dialog, invalid URL, progress state, success-to-editor flow, retained URL after failure, cancellation, and disabled offline/unconfigured behavior.
2. Run the UI tests and confirm they fail for missing behavior.
3. Implement the shared add menu and responsive import surface using the existing design tokens and editor flow.
4. Keep the imported recipe unsaved until the existing Save action is used; Cancel must leave the collection unchanged.
5. Run UI and full test suites, then commit.

### Task 4: Documentation and verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

1. Document Edge Function serving/deployment and the cloud/online requirement.
2. Run `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`.
3. Run local function/parser tests supported by the installed toolchain.
4. Verify the mobile and desktop import surfaces in the browser, including one success fixture and one error.
5. Perform spec-compliance and code-quality review, fix all findings, and commit.

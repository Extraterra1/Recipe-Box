# Supabase Cookbook Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create first-user cookbooks atomically under RLS and deploy a verified Vercel preview.

**Architecture:** Add a narrowly scoped authenticated Supabase RPC that creates the cookbook and owner membership transactionally. Replace the frontend's two direct inserts with that RPC while retaining the existing membership lookup and invite workflow.

**Tech Stack:** PostgreSQL/Supabase RLS, TypeScript, React, Supabase JS, Vitest, Vite, Vercel

---

### Task 1: Lock the secure migration contract

**Files:**
- Modify: `src/lib/supabaseMigration.test.ts`
- Modify: `supabase/migrations/20260514160000_initial_recipe_box.sql`

1. Add assertions requiring `create_cookbook_for_current_user`, an `auth.uid()` guard, revoked public execution, and an authenticated grant.
2. Run `npm test -- src/lib/supabaseMigration.test.ts` and confirm it fails because the function is absent.
3. Add the minimal transactional SQL function and permissions.
4. Re-run the focused test and confirm it passes.

### Task 2: Switch first-user creation to the RPC

**Files:**
- Create: `src/lib/recipeService.test.ts`
- Modify: `src/lib/recipeService.ts`

1. Add a focused test with a Supabase client stub proving `ensureCookbook` calls `create_cookbook_for_current_user` when membership is absent and maps the returned cookbook.
2. Run the focused test and confirm it fails against the direct-insert implementation.
3. Replace the direct cookbook and membership inserts with one RPC call.
4. Re-run the focused test and confirm it passes.

### Task 3: Verify and deploy

**Files:**
- No production file changes expected.

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Run `vercel deploy /Users/cpires/Recipe\ Box -y` to create a preview.
5. Report the preview URL and any environment variables that still need configuration.

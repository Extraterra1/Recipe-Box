# Recipe Box

A production-ready household recipe PWA built with Vite, React, TypeScript, Supabase, Dexie, and `vite-plugin-pwa`.

## What It Does

- Seeds the app with the 40 Markdown recipes in `Recipes/`.
- Keeps a local IndexedDB recipe cache for offline reads.
- Supports search across title, source, tags, ingredients, notes, and directions.
- Provides favorites, tag filters, recipe detail, create/edit/delete, Markdown import, and Markdown/JSON export.
- Uses Supabase Auth magic links plus RLS-protected household cookbooks when configured.
- Builds as an installable PWA with a generated service worker.

## Local Development

```bash
npm install
npm run generate:seed
npm run dev
```

Open `http://localhost:5173/`.

Without Supabase environment variables, Recipe Box runs in local seeded mode and shows `Offline ready`.

## Supabase Setup

Create a Supabase project, then set:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Apply the SQL in:

```text
supabase/migrations/20260514160000_initial_recipe_box.sql
```

The migration creates:

- `cookbooks`
- `cookbook_members`
- `recipes`
- RLS policies for household membership
- `join_cookbook_by_invite(requested_invite_code text)` for safe invite joins

## Quality Checks

```bash
npm test
npm run typecheck
npm run build
```

## Notes

- The Supabase CLI is not required to run the app locally.
- The Supabase client is lazy-loaded so local/offline mode does not pull it into the first JavaScript chunk.
- Re-run `npm run generate:seed` after changing files in `Recipes/`.

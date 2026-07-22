# Recipe Box

A production-ready household recipe PWA built with Vite, React, TypeScript, Supabase, Dexie, and `vite-plugin-pwa`.

## What It Does

- Seeds the app with the 40 Markdown recipes in `Recipes/`.
- Keeps a local IndexedDB recipe cache for offline reads.
- Supports search across title, source, tags, ingredients, notes, and directions.
- Provides favorites, tag filters, recipe detail, create/edit/delete, recipe URL and Markdown import, and Markdown/JSON export.
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
Recipe URL import is unavailable in that mode because the app must call the hosted `import-recipe` Edge Function.

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

### Recipe URL Import

Recipe URL import requires all of the following:

- An internet connection.
- A configured Supabase project and the two `VITE_SUPABASE_*` values above.
- A signed-in Supabase user. The Edge Function accepts authenticated user requests only.
- The `import-recipe` Edge Function running locally or deployed to the configured project.

To run the Supabase stack and Edge Function locally:

```bash
npx supabase start
npx supabase functions serve
```

Use the local API URL and publishable key reported by the CLI for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then run `npm run dev` in another terminal.

To deploy the importer to the linked Supabase project:

```bash
npx supabase functions deploy import-recipe
```

The function configuration in `supabase/config.toml` intentionally sets `verify_jwt = false`. This lets unauthenticated browser `OPTIONS` preflight requests reach the function. The POST handler still enforces application-level Supabase user authentication through `withSupabase({ auth: 'user' })`. Do not remove either layer when changing the import endpoint.

## Quality Checks

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

## Notes

- The Supabase CLI is not required for local seeded mode. It is required to serve or deploy the recipe URL importer.
- The Supabase client is lazy-loaded so local/offline mode does not pull it into the first JavaScript chunk.
- Re-run `npm run generate:seed` after changing files in `Recipes/`.

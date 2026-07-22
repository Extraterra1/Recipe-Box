# Recipe Box

A production-ready household recipe PWA built with Vite, React, TypeScript, Supabase, Dexie, and `vite-plugin-pwa`.

## What It Does

- Seeds the app with the 40 Markdown recipes in `Recipes/`.
- Keeps a local IndexedDB recipe cache for offline reads.
- Supports search across title, source, tags, ingredients, notes, and directions.
- Provides favorites, tag filters, recipe detail, create/edit/delete, recipe URL and Markdown import, and Markdown/JSON export.
- Uses Supabase Auth email/password and Google sign-in with automatic same-email identity linking.
- Builds as an installable PWA with a generated service worker.

## Local Development

```bash
npm install
npm run generate:seed
npm run dev
```

Open `http://localhost:5173/`.

Recipe Box is authentication-gated. Without the Supabase environment variables, the login page explains that cloud login is unavailable and no recipes are shown.

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

### Authentication

Email/password and Google sign-in are available from the standalone login page. New email accounts open immediately because email confirmation is disabled. Password recovery still uses a secure email reset link.

In Supabase Dashboard:

1. Open **Authentication → Providers → Email**. Enable email/password signup and turn off **Confirm email**.
2. Open **Authentication → URL Configuration**. Set the production site URL and allow both `http://localhost:5173` and the production origin as redirects.
3. Open **Authentication → Providers → Google** and enable Google after creating a Web OAuth client in Google Cloud.

Configure the Google Web OAuth client with this authorized redirect URI:

```text
https://dioqzlugpblppmcuttny.supabase.co/auth/v1/callback
```

Copy the Google client ID and client secret into the Supabase Google provider settings. Never put the Google secret or a Supabase service-role key in Vite environment variables.

Supabase automatically links Google and email identities that use the same email address. A Google-first user can add password access from **Settings → Account** without creating another user.

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

The importer accepts the app's Supabase publishable key, so recipe import works without requiring a signed-in user. Keep platform JWT verification disabled for this function and use `withSupabase({ auth: 'publishable' })` to validate the `apikey` header. The function's CORS wrapper handles browser `OPTIONS` preflight requests according to Supabase's Edge Function guidance.

## Quality Checks

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

## Notes

- The Supabase CLI is required only when serving the local Supabase stack or deploying the recipe URL importer.
- Signed-in recipes remain readable from the IndexedDB cache while offline; signing out hides all recipe and household UI.
- The Supabase client is lazy-loaded from the browser application.
- Re-run `npm run generate:seed` after changing files in `Recipes/`.

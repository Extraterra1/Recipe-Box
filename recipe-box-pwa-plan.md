# Recipe Box PWA Plan

## Summary
Build a small household recipe PWA called **Recipe Box** using the 40 Markdown recipes already in [/Users/cpires/Paprika MDs](/Users/cpires/Paprika%20MDs) as seed data. The app should feel light, playful, and Canva-adjacent: airy layout, warm off-white background, soft coral/yellow/mint accents, rounded but not childish controls, and zero marketing-page fluff.

Use **Supabase as the source of truth** for continuity and household sharing, with **IndexedDB via Dexie** as a local read cache so recipes stay available offline. This avoids relying on iOS browser storage as the only copy of the cookbook.

## Key Changes
- Stack: **Vite + React + TypeScript**, plain CSS/Tailwind-style utility classes, `vite-plugin-pwa`, Supabase JS client, Dexie.
- Auth: Supabase email magic link. First user creates a household cookbook; owner can generate/reset an invite code; invited household members join as editors.
- Database:
  - `cookbooks`: shared cookbook metadata, owner, invite code hash.
  - `cookbook_members`: user membership and role: `owner` or `editor`.
  - `recipes`: title, source, servings/times, ingredients array, directions array, notes, nutrition, tags, favorite flag, created/updated metadata.
- Security: enable Supabase RLS on all tables. Users can only read/write recipes for cookbooks where they are members.
- Sync: cloud writes happen online only; app caches latest recipes locally for offline viewing. On login, app foreground, and manual refresh, pull latest recipes into Dexie. Use `updated_at` last-write-wins for v1.
- Import/export:
  - One-time importer parses the existing Markdown files into recipes.
  - App supports exporting all recipes as Markdown plus JSON backup.
  - No image upload in v1; keep an optional `image_url` field for later.

## App Features
- Recipe list: search by title, tag, ingredient, and source; filter by tags/favorites.
- Recipe detail: readable ingredients, directions, source link, notes, nutrition.
- Add/edit recipe: simple form with title, source URL, servings, tags, ingredients, directions, notes.
- Household settings: members list, invite code controls, import/export, sync status.
- PWA behavior: installable on iPhone home screen, app shell cached, recipes readable offline, online/offline banner, friendly empty states.
- Out of scope for v1: meal planning, shopping lists, timers, scaling, comments, ratings, public sharing, OCR, scraping websites, image management.

## Test Plan
- Unit tests for Markdown import: headings, source links, ingredients, directions, notes, nutrition, duplicate titles.
- Supabase tests for RLS: non-members cannot read/write; members can CRUD recipes in their cookbook.
- UI tests for auth-gated app shell, recipe search/filter, create/edit/delete, import/export.
- PWA checks: manifest, icons, service worker build, offline app shell, offline recipe reads from Dexie.
- Mobile QA on iPhone-sized viewport: list/detail/editor remain comfortable and text does not overflow.

## Assumptions & References
- Chosen defaults: household sharing, Essentials+ feature depth, cloud source of truth, offline reads only for v1.
- Storage decision follows current browser guidance: IndexedDB is appropriate for structured local data, but browser storage can be evicted, so it should not be the only durable copy. References: [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [web.dev PWA offline data](https://web.dev/learn/pwa/offline-data).
- Supabase RLS/auth model follows Supabase’s `auth.uid()`-based row access pattern. References: [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vite PWA docs](https://vite-pwa-org.netlify.app/), [Dexie docs](https://dexie.org/docs/).

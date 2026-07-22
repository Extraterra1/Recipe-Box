# Recipe URL Import Design

## Goal

Let a user paste a public recipe URL, extract its useful recipe data, review the result in the existing editor, and save it to the current cookbook.

## Experience

The existing add action opens a two-choice menu: **Create manually** or **Import from URL**. URL import uses a bottom sheet on mobile and a centered dialog on desktop. The URL remains visible during errors, importing has an explicit progress state, and successful extraction opens the existing editor with a prefilled unsaved recipe. Canceling the editor does not save anything.

URL import is available only while online with Supabase configured. The rest of Recipe Box retains its existing local and offline behavior.

## Architecture

The React client invokes an authenticated `import-recipe` Supabase Edge Function. The function validates the target against SSRF risks, fetches bounded HTML, extracts a normalized recipe draft, and returns stable error codes. It prefers Schema.org `Recipe` JSON-LD, including `@graph` and nested instruction sections, then uses a narrowly scoped HTML recipe-card fallback needed by the Sage Bakes fixture.

The normalized response maps onto the existing recipe model without a database migration: title, image URL, source label and URL, metadata, ingredients, directions, notes, nutrition, and tags. Ingredient and instruction section labels remain readable entries. Missing data stays empty rather than being invented.

## Safety and Errors

Only public HTTP/HTTPS destinations are accepted. The function blocks localhost, private/link-local/reserved IP ranges, credentials in URLs, non-HTML responses, excessive redirects, oversized bodies, and slow requests. Redirect destinations receive the same validation. Errors use `INVALID_URL`, `BLOCKED_URL`, `FETCH_FAILED`, `UNSUPPORTED_CONTENT`, `RECIPE_NOT_FOUND`, or `PARSE_FAILED`; the UI maps them to concise messages and never exposes fetched HTML or internal exceptions.

## Verification

Fixture tests cover the supplied Sage Bakes and Joshua Weissman pages. Unit tests cover JSON-LD shapes, nested sections, HTML fallback extraction, URL safety, client error mapping, and UI success/failure flows. Browser checks cover the mobile sheet and desktop dialog, followed by the full test, typecheck, build, and diff checks.

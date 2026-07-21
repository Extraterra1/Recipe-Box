# Supabase Cookbook Bootstrap Design

## Goal

Make first sign-in reliably create a household cookbook under Supabase row-level security, then deploy a verified Vercel preview.

## Design

Creation will move from two client-side inserts to one authenticated database RPC named `create_cookbook_for_current_user`. The function will generate the cookbook and owner membership in one transaction, derive the owner from `auth.uid()`, reject unauthenticated calls, and return the cookbook fields required by the UI.

The function must be `security definer` because the owner membership does not exist yet. It will use a fixed `search_path`, revoke default public execution, and grant execution only to `authenticated`. The frontend will call the RPC only when no membership exists; existing membership lookup and invite joining remain unchanged.

## Error Handling and Security

Any database error will continue through the existing application bootstrap error handling. The client will never send or choose an owner ID. No service-role credentials will be added to the browser or deployment.

## Verification

A migration contract test will fail until the secure RPC exists, and a recipe-service test will assert that first-user creation calls the RPC and maps its result. Then the complete test, typecheck, and production build suite will run before a Vercel preview deployment.

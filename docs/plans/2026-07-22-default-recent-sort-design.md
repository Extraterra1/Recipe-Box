# Default Recently Modified Sort Design

## Goal

Open the recipe collection with recipes ordered by most recently modified, while preserving the existing sort control and alphabetical option.

## Design

Initialize the collection's existing `recipeSort` state to `recent`. The existing `sortRecipes` helper already orders valid `updatedAt` values newest-first and uses recipe title as a deterministic fallback for equal or invalid dates, so no sorting algorithm or data-loading changes are needed.

The selection remains session-only: users can switch to alphabetical for the current session, and a fresh app session returns to recently modified. No local-storage preference or database ordering is introduced.

## Testing

Update the existing app-level sorting test to assert that the sort control initially selects `recent` and that the first recipe row matches the most recently modified seed recipe. Keep the existing helper assertions covering newest-first ordering, immutability, ties, and invalid dates.

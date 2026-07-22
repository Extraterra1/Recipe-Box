# Collection Selection Highlight Design

## Problem

The recipe list renders the internally selected recipe with the `selected` class while the collection menu is active. Because bootstrap selects the first recipe and detail navigation preserves the opened recipe, the collection shows a red title on initial load and after returning from detail.

## Design

Keep `selectedId` and the selected recipe unchanged because they support the desktop preview, detail context, and scroll restoration. Limit the list's visual selection to the detail view by passing no selected row while `view === 'collection'`.

This separates navigation state from collection presentation without changing recipe loading, filtering, detail navigation, or desktop preview behavior.

## Testing

Add regressions proving that the loaded collection has no selected row and that opening a recipe then returning to the collection clears the visual highlight.

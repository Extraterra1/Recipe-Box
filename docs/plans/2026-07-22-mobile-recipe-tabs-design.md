# Mobile Recipe Tabs Design

## Scope

Add a fixed bottom tab bar on screens below 760px with exactly two destinations: `Recipes` and `Favorites`. Recipes shows the complete collection; Favorites shows only recipes marked as favorites. Keep the existing tablet and desktop library navigation unchanged.

## Interaction

- Recipes is active when the favorites-only filter is off.
- Favorites is active when the favorites-only filter is on.
- Selecting Recipes clears tag filters so the complete collection is visible.
- Selecting Favorites enables the favorites-only filter and clears tag filters so only favorited recipes are visible.
- Search and sort continue to apply inside the active tab.
- Opening and returning from recipe details preserves the selected tab through the existing collection state.

## Presentation

The bar is fixed to the bottom of the mobile viewport and contains two equal-width icon-and-label buttons. It uses the existing warm canvas, separator, muted text, and deep food-red active color. It respects the device safe area, and the mobile collection and detail surfaces receive enough bottom inset that content is never obscured.

## Accessibility

The control is labelled as recipe views. Each native button exposes its selected state with `aria-current="page"`; labels remain visible. Touch targets are at least 44 pixels high.

## Testing

Component tests cover the two labels, the default Recipes state, Favorites filtering, returning to the full Recipes collection, and clearing tag filters. CSS tests protect mobile-only visibility, fixed positioning, safe-area padding, and hidden state at wider breakpoints.

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

The bar is a unified floating capsule inset from the mobile viewport edges and bottom safe area. It contains two equal-width icon-and-label buttons on a regular Liquid Glass-inspired material: translucent warm tint, backdrop blur and saturation, a fine inner highlight, and restrained layered shadow. Content remains visible beneath the material, while the app shell reserves enough bottom space that the final recipe stays reachable.

The selected item uses the existing deep food-red tint with a subtle translucent lens and a filled icon. The unselected item remains muted. The control has no full-width background or hard edge divider. When reduced transparency is requested, the bar becomes an opaque warm surface; reduced motion continues to suppress transitions.

## Accessibility

The control is labelled as recipe views. Each native button exposes its selected state with `aria-current="page"`; labels remain visible. Touch targets are at least 44 pixels high.

## Testing

Component tests cover the two labels, the default Recipes state, Favorites filtering, returning to the full Recipes collection, and clearing tag filters. CSS tests protect mobile-only visibility, fixed positioning, safe-area padding, and hidden state at wider breakpoints.

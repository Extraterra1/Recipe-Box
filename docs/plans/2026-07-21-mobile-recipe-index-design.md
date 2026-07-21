# Mobile Recipe Index Redesign

## Goal

Replace the existing Recipe Box interface with a modern, iOS-first personal cookbook. The opening screen must show the logo and product name, search, and the complete recipe collection in that order. A recipe should be findable and openable in seconds.

## Direction

The selected direction is **Recipe Index**: a single-column, title-led list based on familiar iOS utility patterns. Paprika informs the direct workflow but not the visual styling. The new interface avoids the warm card-heavy system currently in the app and does not use photography as its organizing principle.

Each recipe row has one dominant title and a fixed square thumbnail position. When photography exists, it appears as a small supporting image. When it does not, the same space contains a quiet tinted square and a simple recipe-book or utensils icon. This preserves rhythm without inventing fake imagery or making missing images look like errors.

## Home Screen

The mobile home screen is one vertical sequence:

1. Compact centered logo and `Recipe Box` name.
2. Full-width native-feeling search field.
3. Full recipe index with no intervening dashboard, filters, or promotional content.

Rows use separators rather than floating cards. Add and settings remain available as quiet standard navigation actions. Recipe metadata, tags, sources, ratings, and row-level actions stay out of the default index.

## Visual System

The system uses warm near-white and near-black neutrals with a restrained deep food-red accent. Typography uses the iOS system stack. Character comes from precise spacing, stable geometry, and carefully edited content. It explicitly avoids gradients, glass effects, oversized rounding, decorative pills, eyebrow labels, generic marketing copy, cute kitchen motifs, and unnecessary shadows.

## Navigation and Responsive Behavior

Opening a recipe on iPhone navigates to a dedicated detail screen. Returning restores the search query and scroll position. Desktop preserves the same title-led information architecture and may introduce a two-pane layout only when width allows it; it does not replace the collection with a photo grid.

## States and Resilience

Loading uses stable recipe-row skeletons so layout does not jump. No-results and empty-collection states use short direct copy while keeping relevant controls visible. Missing images always use the defined placeholder. Search filters immediately and remains available during no-results states.

## Verification

Implementation should be checked at narrow iPhone widths first, including 320px and 390px, then at tablet and desktop widths. Tests should cover initial recipe rendering, search filtering, opening and returning from a recipe, placeholder rendering for missing images, real thumbnail rendering when available, and preservation of the existing offline recipe data flow.

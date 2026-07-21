# Desktop Cookbook Library Design

## Goal

Turn Recipe Box into a purpose-built desktop cookbook-management workspace without weakening the approved mobile experience. Desktop is for searching, organizing, inspecting, importing, and editing recipes. It is not intended as a cooking display.

## Approved Direction

The selected direction is **Cookbook Library**. At desktop widths the interface presents three functional regions at once: persistent library navigation, a searchable recipe index, and a read-only recipe preview. This is an adaptation of the same information architecture, not a separate product and not a larger mobile screen.

## Library Navigation

The left column is 216–240px wide and owns global context and organization:

- Compact Recipe Box identity at the top.
- All Recipes and Favorites destinations with counts.
- Scrollable tag navigation with active state and counts where practical.
- Import/Export and Settings grouped near the bottom.
- A clear Create Recipe action that does not compete with search.

Navigation uses plain rows, separators, and restrained selected states. It does not use a stack of floating cards or colorful category pills.

## Recipe Index

The middle column is 360–420px wide and optimized for scanning:

- Search remains the primary control.
- A compact utility row shows result count and alphabetical/recent sort.
- Each recipe row shows title as the dominant signal.
- The fixed thumbnail remains secondary and uses the established placeholder when absent.
- Source and modified date may appear as quiet supporting metadata.
- The selected recipe uses a restrained tonal background and clear focus state.

The index scrolls independently. Selecting a recipe updates the preview without removing either navigation or the list. The selected row remains visible.

## Read-Only Preview

The right pane opens in read mode and uses the available width for comprehension:

- Recipe title, source, and metadata establish context.
- Edit, Favorite, and destructive actions are grouped consistently near the title.
- Ingredients and directions can sit side by side when the preview is sufficiently wide.
- Notes and nutrition follow below without nested-card treatment.
- Empty recipe sections use direct inline copy and an Edit action.

Editing replaces the preview content in place. It does not open a modal and does not turn the default preview into a permanent form.

## Desktop Interaction

- Mouse hover reveals restrained secondary affordances where useful.
- Keyboard focus follows navigation, index, and preview order.
- Search supports immediate filtering without changing panes.
- Navigation filters update the index and preserve the selected recipe when it remains valid.
- `Escape` returns from editing to the read-only preview when no field-level interaction consumes it.
- No right-click menu, drag-and-drop, or multi-select in the first version. These are not yet earned by the collection size.

## Responsive Boundaries

- **1180px and above:** full Cookbook Library with navigation, index, and preview.
- **760–1179px:** existing two-pane tablet experience.
- **Below 760px:** existing iOS-first single-surface mobile flow.

Desktop widths are capped so the preview remains readable on very large monitors. Navigation and index use stable widths; the preview absorbs remaining space.

## Visual Character

Reuse the established warm neutral canvas, deep food-red accent, system typography, thin separators, and quiet thumbnail placeholders. Desktop gains density and structure, not additional decoration. Avoid dashboard widgets, cards around every region, gradients, large empty headers, excessive rounded corners, and oversized typography.

## States and Resilience

Loading keeps the three-column shell stable and uses skeleton navigation counts, recipe rows, and preview lines. Empty collections retain navigation and search while giving one direct Create Recipe action. Search/filter no-results preserve the active query and navigation context. Broken recipe images continue to fall back to the established placeholder.

## Verification

Verify at 1180×800, 1440×900, 1728×1117, and 2560×1440. Confirm independent scrolling, stable selection, keyboard order, long titles, many tags, missing images, editor replacement, settings access, and absence of horizontal overflow. Re-run the existing 320px, 390px, and 768px checks to confirm mobile and tablet behavior remain intact.

---
name: Recipe Box
description: A title-led, iOS-first personal recipe index with quiet optional imagery and precise native utility.
---

# Design System: Recipe Box

## 1. Overview

**Creative North Star: The Recipe Index**

Recipe Box should feel like a current first-party iOS utility made for one task: finding and using a saved recipe. The home screen is a calm vertical sequence of identity, search, and the collection. Recipe titles carry recognition. Photography is useful supporting information, never the visual premise of the screen.

The interface is restrained, text-forward, and structurally familiar. It uses native-feeling typography, controlled spacing, thin separators, and a single deep food-red accent. Personality comes from proportion and editing, not from decorative kitchen motifs. The visual system must look considered even when every recipe image is missing.

**Key characteristics:**

- iPhone-first composition with desktop adaptation, not desktop compression.
- Single-column recipe index with stable rows.
- Recipe title as the primary element in every row.
- Fixed square image position on every row.
- Quiet icon placeholder when a recipe has no image.
- Restrained color, minimal radius, and no ornamental surfaces.

## 2. Theme and Scene

The user is standing in a naturally lit kitchen, holding an iPhone in one hand and trying to find a familiar recipe before beginning. This requires a light theme with strong legibility, low visual noise, and controls that are easy to recognize at a glance.

Dark mode may follow the system in a later pass, but it should not delay or weaken the light-mode foundation.

## 3. Color

Use a restrained strategy. Tinted neutrals carry nearly the whole interface; deep food red is reserved for actions, focus, and selection.

- **Canvas:** `oklch(98% 0.006 55)`, a warm off-white rather than pure white.
- **Primary text:** `oklch(20% 0.012 35)`, a warm near-black.
- **Secondary text:** `oklch(48% 0.014 40)`.
- **Separator:** `oklch(88% 0.010 45)`.
- **Search surface:** `oklch(94.5% 0.009 50)`.
- **Placeholder surface:** `oklch(92.5% 0.018 52)`.
- **Placeholder icon:** `oklch(60% 0.025 45)`.
- **Accent:** `oklch(48% 0.145 28)`, a deep food red used sparingly.
- **Destructive:** `oklch(55% 0.19 25)`.

Never use pure black, pure white, gradients, or color as decoration. Real recipe photos provide the screen's natural variation.

## 4. Typography

Use the iOS system stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`.

- **App name:** 24px, 700, compact line height.
- **Recipe title:** 17px, 600, two lines maximum on the index.
- **Body:** 17px, 400, optimized for recipe reading.
- **Secondary metadata:** 13px, 500.
- **Control label:** 15px, 600.

Do not introduce a display typeface. Avoid eyebrow labels, all-caps section introductions, ornamental italics, and arbitrary emphasis. Hierarchy comes from size, weight, position, and space.

## 5. Home Screen

The home screen follows one uninterrupted vertical rhythm:

1. A compact centered logo above the name `Recipe Box`.
2. A full-width iOS-style search field.
3. The recipe index, beginning immediately after the search field.

The header has enough top inset to respect the iPhone safe area but should not resemble a marketing hero. Search remains easy to reach and may become sticky once the collection scrolls. Secondary actions such as add and settings use familiar symbols in a quiet navigation position; they do not compete with the product name or search.

## 6. Recipe Index Row

Each recipe is a full-width row separated by a one-pixel line. It is not a floating card.

- Minimum row height: 80px.
- Leading content: recipe title, vertically centered and allowed up to two lines.
- Trailing content: fixed 56px square image area.
- Real images use `object-fit: cover` and a restrained 10px radius.
- Missing images retain the same square and use the placeholder surface with a centered, single-weight recipe-book or utensils icon.
- The placeholder must be quieter than photography and must not include text, gradients, patterns, or illustrations.
- The whole row is the tap target.

Do not add source, tags, ratings, descriptions, status badges, or action buttons to the default row. Those details belong after opening a recipe.

## 7. Components and Surfaces

### Search

Use the familiar iOS search vocabulary: magnifying-glass icon, plain placeholder copy (`Search recipes`), rounded rectangle, and a clear button only when text exists. Radius should feel native, not pill-like. Search filters the visible collection immediately.

### Navigation controls

Use SF Symbols-equivalent Lucide icons with consistent stroke weight. Actions must occupy at least a 44px touch area even when the visible glyph is smaller. Avoid labeled capsules for standard add, back, search-clear, and settings actions.

### Recipe detail

Recipe detail is a separate mobile screen, not a second pane beside the index. Back navigation returns to the same search and scroll position. Ingredients and directions favor readable text and standard controls. Photography may enrich the detail page but must remain optional.

### Empty and loading states

Loading uses rows with stable text and thumbnail geometry. No centered spinner takeover. A search with no matches keeps the search field visible and shows one direct sentence. An empty collection explains how to add the first recipe without illustration or promotional copy.

## 8. Layout and Responsive Behavior

The mobile layout is canonical from 320px upward. Content uses 16px horizontal insets, safe-area padding, and no outer card shell.

On wider screens, preserve the title-led index rather than transforming it into a photo grid. Desktop becomes a cookbook-management workspace called **Cookbook Library**, not a centered or enlarged mobile screen.

### Desktop Cookbook Library

At 1180px and above, use three functional regions:

1. **Library navigation**, 216–240px: product identity, All Recipes, Favorites, tag navigation, Import/Export, and Settings.
2. **Recipe index**, 360–420px: search, result count and sort control, then a dense title-led list.
3. **Read-only preview**, flexible with a comfortable maximum reading width: recipe title and actions, metadata and source, ingredients, directions, notes, and nutrition.

The navigation and recipe index remain visible while the preview changes. The preview opens in read mode. Editing replaces the preview pane rather than opening a modal or making every field permanently editable.

Desktop recipe rows may show title, small thumbnail or placeholder, source, and modified date. Favorites and tags are browsing tools in the persistent navigation, not chips above the index. Row actions appear through selection or restrained hover affordances, never as a permanent cluster on every row.

The desktop header is integrated into the library navigation. Do not center the logo over the entire application, strand add/settings controls at viewport edges, or leave a narrow mobile column floating in empty space.

From 760px to 1179px, retain the existing two-pane tablet behavior. Below 760px, retain the dedicated single-surface mobile flow.

## 9. Motion

Use 150–220ms ease-out transitions for state feedback, navigation, and search clearing. Animate opacity and transforms only. Respect the operating system's reduced-motion setting. No orchestrated entrances, bouncing icons, animated gradients, or decorative page-load sequences.

## 10. Anti-slop Rules

- No gradients, glassmorphism, oversized radii, floating badges, or shadows on every surface.
- No eyebrow labels, split-color headlines, marketing copy, or decorative section introductions.
- No repeated floating cards; use rows and separators where the information is inherently a list.
- No photo-first grid that makes imageless recipes look second class.
- No placeholder illustrations that compete with real recipe photos.
- No category chips or filters on the initial screen unless a demonstrated collection need earns them later.
- No visual homage to Paprika's dated interface. Preserve only its direct, task-first workflow.

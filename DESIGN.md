---
name: Recipe Box
description: A playful household recipe PWA with a warm full-palette system for cooking, search, and shared editing.
---

<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Recipe Box

## 1. Overview

**Creative North Star: "The Sunday Recipe Drawer"**

Recipe Box should feel like a favorite household recipe drawer translated into software: organized, warm, a little playful, and immediately useful. The design should have enough color to feel personal, but it must never compete with the practical work of cooking, searching, editing, syncing, and preserving recipes.

The system uses a full palette led by soft coral, supported by butter yellow, garden mint, tomato red, and tinted warm neutrals. The atmosphere is bright and domestic rather than nostalgic Paprika export, recipe blog, or admin console. Playfulness comes through soft visual rhythm, friendly labels, and tactile controls, not novelty type or clutter.

Motion should be responsive: feedback, transitions, and small reveals are welcome when they confirm state or reduce friction. No choreographed page loads, no theatrical entrances, and no animation that makes users wait while they are cooking.

**Key Characteristics:**
- Full palette, but role-driven and restrained inside task-heavy screens.
- Warm, useful, household-native interface language.
- Playful without childish decoration.
- Readable recipe pages before anything else.
- Familiar product patterns with friendly texture around the edges.

## 2. Colors

The palette should feel like a bright kitchen counter with real ingredients nearby: coral warmth, soft yellow lift, mint freshness, tomato urgency, and warm neutral surfaces. Exact values are to be resolved during implementation.

### Primary
- **Soft Coral** ([to be resolved during implementation]): Primary actions, current selection, important CTAs, and the small moments that should feel warm and active.

### Secondary
- **Butter Yellow** ([to be resolved during implementation]): Gentle highlights, optimistic empty states, badges for friendly guidance, and light emphasis where coral would feel too urgent.
- **Garden Mint** ([to be resolved during implementation]): Freshness, offline-ready status, successful sync, saved states, and calm confirmation.

### Tertiary
- **Tomato Red** ([to be resolved during implementation]): Destructive actions, validation errors, expired invites, failed sync, and other states that need attention without becoming alarming.

### Neutral
- **Warm Flour Surface** ([to be resolved during implementation]): Main app background, tuned off-white rather than pure white.
- **Recipe Ink** ([to be resolved during implementation]): Primary text, never pure black.
- **Pantry Line** ([to be resolved during implementation]): Borders, dividers, separators, and subtle input outlines.
- **Shelf Shadow** ([to be resolved during implementation]): Muted text and inactive controls.

### Named Rules

**The Full Palette With Jobs Rule.** Every saturated color must have a job: action, success, warning, destructive state, tag family, or selection. Color used only as decoration is forbidden.

**The Not Paprika Rule.** Do not copy Paprika's paper-export look, red section headers, tiny Helvetica recipe printout feel, or flat document-like recipe pages.

## 3. Typography

**Display Font:** [playful display direction to be chosen at implementation]
**Body Font:** [warm sans direction to be chosen at implementation]
**Label/Mono Font:** [optional utility font to be chosen at implementation]

**Character:** Typography should feel friendly and capable: expressive enough for recipe titles and empty states, plain enough for ingredients, quantities, form labels, and settings. Playful does not mean novelty.

### Hierarchy
- **Display** ([to be resolved during implementation]): Recipe names, major empty states, and first-run welcome only. Use sparingly.
- **Headline** ([to be resolved during implementation]): Screen titles, settings groups, and major recipe sections.
- **Title** ([to be resolved during implementation]): Recipe cards, list rows, form sections, and panels.
- **Body** ([to be resolved during implementation]): Ingredients, directions, notes, and settings copy. Recipe reading should cap around 65-75ch.
- **Label** ([to be resolved during implementation]): Buttons, chips, metadata, field labels, and status text.

### Named Rules

**The Measuring Spoon Rule.** Numbers, quantities, and steps must be plain, stable, and easy to scan. Never use decorative type for measurements, timers, servings, or directions.

## 4. Elevation

Recipe Box should be flat by default with depth created through tonal layering, borders, and occasional soft lifted states. Shadows can appear on active menus, floating controls, and hoverable recipe tiles, but recipe content should not feel like a stack of cards.

### Named Rules

**The Countertop Rule.** Surfaces rest on the same counter unless interaction requires lift. Use shadows for menus, active controls, and temporary surfaces, not for every container.

## 5. Components

No components exist yet. Re-run `/impeccable document` once the app has CSS tokens, component files, or rendered screens; that pass should extract real buttons, inputs, chips, navigation, recipe list rows, recipe detail sections, sync banners, and household settings patterns.

## 6. Do's and Don'ts

### Do:
- **Do** use a full palette with named jobs: soft coral for primary actions, butter yellow for warmth, garden mint for success and offline readiness, tomato red for destructive and error states, and warm neutrals for recipe reading.
- **Do** keep recipe pages readable first: comfortable type, generous line height, large tap targets, and layouts that work on an iPhone in a kitchen.
- **Do** make sync, offline, invite, and backup states calm and clear.
- **Do** use responsive motion for feedback, transitions, and small state changes.
- **Do** make the app feel household-native: shared, dependable, and personal without turning into a social platform.

### Don't:
- **Don't** make it feel like Paprika: no paper-export look, no red printout section headers, no tiny Helvetica recipe sheet aesthetic, no static document-page layout as the main product language.
- **Don't** use marketing-page fluff, recipe-blog clutter, dark productivity dashboards, sterile enterprise admin UI, or generic SaaS polish.
- **Don't** make the app feel like a content platform, social feed, or monetized recipe site.
- **Don't** let heavy decoration, novelty typography, low-contrast pastel text, or precision-only interactions compete with recipe readability.
- **Don't** use color without a functional role, gradient text, decorative glass effects, side-stripe accents, or identical card grids.

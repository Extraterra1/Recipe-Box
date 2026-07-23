# PWA Icon Alternatives Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate and validate three clean PWA icon alternatives for Recipe Box without replacing the current icon.

**Architecture:** Generate three independent square bitmap concepts from a shared visual system, then copy the final assets into a dedicated public preview directory. Validate the icons visually at full size and through reduced-size contact sheets before presenting them to the user.

**Tech Stack:** Built-in image generation, PNG assets, ImageMagick or bundled image tooling for size previews.

---

### Task 1: Generate the cookie icon

**Files:**
- Create: `public/icon-alternatives/cookie.png`

1. Generate a 512 x 512 clean flat icon using the approved cookie-protagonist design.
2. Inspect the result for silhouette, padding, contrast, and accidental text.
3. Copy the accepted output into `public/icon-alternatives/cookie.png`.

### Task 2: Generate the recipe-card-box icon

**Files:**
- Create: `public/icon-alternatives/recipe-card-box.png`

1. Generate a 512 x 512 clean flat icon using the approved recipe-card-box design.
2. Inspect the result for silhouette, padding, contrast, and accidental text.
3. Copy the accepted output into `public/icon-alternatives/recipe-card-box.png`.

### Task 3: Generate the whisk monogram icon

**Files:**
- Create: `public/icon-alternatives/whisk-monogram.png`

1. Generate a 512 x 512 clean flat icon using the approved whisk-monogram design.
2. Inspect the result for silhouette, padding, contrast, and accidental text.
3. Copy the accepted output into `public/icon-alternatives/whisk-monogram.png`.

### Task 4: Produce comparison previews

**Files:**
- Create: `public/icon-alternatives/comparison.png`

1. Resize each icon to representative PWA and favicon sizes.
2. Compose a labeled comparison sheet outside the icons themselves.
3. Inspect the comparison at native scale and confirm all three remain recognizable.
4. Run `git diff --check` and report the generated paths and prompts.

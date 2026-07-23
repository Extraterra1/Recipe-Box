# Google Sign-In Icon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder letter on the Google sign-in button with the official four-color Google mark.

**Architecture:** Keep the icon local and dependency-free by rendering the standard Google mark as a decorative inline SVG inside `AuthScreen`. Preserve the button label as its accessible name and size the SVG through the existing `.google-g` class.

**Tech Stack:** React, TypeScript, SVG, Vitest, Testing Library

---

### Task 1: Render the Google mark

**Files:**
- Modify: `src/AuthScreen.tsx`
- Modify: `src/styles.css`
- Test: `src/AuthScreen.test.tsx`

**Step 1: Write the failing test**

Assert that the Google button contains a decorative SVG with the four official brand colors.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/AuthScreen.test.tsx`
Expected: FAIL because the existing placeholder is text rather than an SVG.

**Step 3: Write minimal implementation**

Replace the placeholder `G` span with an `aria-hidden` inline SVG containing the standard blue, red, yellow, and green Google mark paths. Remove text-specific placeholder styling.

**Step 4: Run verification**

Run: `npm test -- --run src/AuthScreen.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: production build exits successfully.

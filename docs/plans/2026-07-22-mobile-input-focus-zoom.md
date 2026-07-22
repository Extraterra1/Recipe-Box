# Mobile Input Focus Zoom Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent Mobile Safari from zooming the viewport when any Recipe Box form control receives focus.

**Architecture:** Add one global rule inside the existing mobile breakpoint so all text-entry controls compute to at least 16px. Keep the viewport metadata unchanged so intentional browser zoom remains available.

**Tech Stack:** CSS, Vitest

---

### Task 1: Protect all mobile form controls from focus zoom

**Files:**
- Modify: `src/styles.test.ts`
- Modify: `src/styles.css`

**Step 1: Write the failing test**

Add a Vitest assertion that the `max-width: 759px` media block contains:

```css
input, textarea, select { font-size: 16px; }
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/styles.test.ts`

Expected: FAIL because the shared mobile form-control rule is absent.

**Step 3: Write the minimal implementation**

Add the shared rule to the existing mobile media block in `src/styles.css`.

**Step 4: Run verification**

Run: `npm test -- src/styles.test.ts`, `npm test`, and `npm run build`.

Expected: all commands pass.

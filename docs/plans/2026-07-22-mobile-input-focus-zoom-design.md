# Mobile Input Focus Zoom Design

## Problem

Mobile Safari automatically zooms the viewport when a focused form control has a computed font size below 16px. Recipe Box inherits smaller text on several controls, so focusing them can unexpectedly magnify the page.

## Design

At the existing mobile breakpoint (`max-width: 759px`), set `font-size: 16px` on `input`, `textarea`, and `select`. This fixes all current and future form controls through one global rule while leaving the viewport zoom configuration accessible to users.

Do not add `maximum-scale` or `user-scalable=no` to the viewport metadata because that would restrict intentional pinch-to-zoom. Do not patch individual fields because new controls could reintroduce the problem.

## Verification

Add a stylesheet regression test that requires the mobile breakpoint to contain the shared rule for all three control types. Run the focused stylesheet test, then the complete test suite and production build.

# 001 — Define Animation Tokens and Global Accessibility Gating

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: HIGH
- **Category**: Accessibility, Cohesion & Tokens
- **Estimated scope**: 2 files (`static/css/design-system.css`, `static/css/components.css`)

## Problem

Key animation tokens are missing from `:root`, causing dependent components to fall back to `0s` (abrupt snapping) or unstandardized curves. Furthermore, there is zero handling for `prefers-reduced-motion`, and interactive `:hover` micro-movements are not gated behind pointer media queries, causing sticky transform bugs on mobile and touch devices.

```css
/* static/css/design-system.css:147-156 — current */
  /* Spring timing */
  --ease-spring: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* Durations */
  --duration-instant: 100ms;
  --duration-fast: 180ms;
  --duration-normal: 300ms;
  --duration-slow: 450ms;
```

`--duration-enter` is invoked in `layout.css:495, 573` and `components.css:522, 585` without existing in `:root`.

## Target

Spelling out the complete token system and establishing global accessibility baselines in `design-system.css`:

```css
/* static/css/design-system.css — target tokens */
  /* Easing curves */
  --ease-spring: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* strong ease-in-out for movement */

  /* Durations */
  --duration-instant: 100ms;
  --duration-fast: 180ms;
  --duration-enter: 220ms;
  --duration-normal: 300ms;
  --duration-slow: 450ms;
```

```css
/* static/css/design-system.css — target accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Repo conventions to follow

- Design tokens live in `:root` in `static/css/design-system.css`.
- Standard durations follow the `--duration-*` naming scheme.

## Steps

1. In `static/css/design-system.css`, update the easing and duration token block:
   - Change `--ease-out` value from `cubic-bezier(0.16, 1, 0.3, 1)` to `cubic-bezier(0.23, 1, 0.32, 1)`.
   - Add `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`.
   - Add `--duration-enter: 220ms;` between `--duration-fast` and `--duration-normal`.
2. In `static/css/design-system.css`, append the `@media (prefers-reduced-motion: reduce)` block at the bottom of the file to guarantee that system-level reduced motion preferences bypass motion transforms while preserving essential color/opacity feedback.
3. In `static/css/components.css`, wrap interactive hover transform rules (`.btn:hover`, `.btn-icon:hover`, `.card-interactive:hover`, `.prompt-chip:hover`) inside `@media (hover: hover) and (pointer: fine)`.

## Boundaries

- Do NOT alter color tokens or typography definitions.
- Do NOT touch MapLibre marker projections or map canvas.

## Verification

- **Mechanical**: Inspect CSS in DevTools; verify that `var(--duration-enter)` resolves to `220ms` and `var(--ease-out)` computes to `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Feel check**:
  - Open Chrome DevTools > Rendering panel > Emulate CSS media feature `prefers-reduced-motion: reduce`.
  - Confirm all drawer transitions and modals instantly appear without animating motion across the screen.
  - Test touch device emulation in DevTools; confirm clicking buttons does not leave a stuck `translateY(-1px)` hover state.
- **Done when**: All variables resolve cleanly without fallbacks and reduced motion is honored across the app.

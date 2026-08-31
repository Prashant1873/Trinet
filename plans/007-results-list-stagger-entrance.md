# 007 — Implement Staggered List Entrance for Company Search Results

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: LOW
- **Category**: Missed opportunities, Cohesion & Tokens
- **Estimated scope**: 2 files (`static/css/layout.css`, `static/js/results.js`)

## Problem

When the user filters or searches companies, newly fetched result cards (up to 50 cards) instantaneously teleport into the sidebar results list. This lacks visual feedback that a fresh set of records has loaded and feels abrupt compared to the rest of the application.

```html
<!-- static/js/results.js — current render -->
<!-- Cards are inserted directly into #results-list-items with no enter transition -->
```

## Target

Introduce a high-performance, non-blocking 30ms staggered entrance using CSS `@keyframes card-stagger-in` capped at the first 12 visible items (to prevent cumulative animation delays on large query batches).

```css
/* static/css/layout.css — target */
.result-card.card-enter {
  opacity: 0;
  transform: translateY(8px);
  animation: card-stagger-in var(--duration-fast) var(--ease-out) forwards;
}

@keyframes card-stagger-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-card.card-enter:nth-child(1) { animation-delay: 0ms; }
.result-card.card-enter:nth-child(2) { animation-delay: 30ms; }
.result-card.card-enter:nth-child(3) { animation-delay: 60ms; }
.result-card.card-enter:nth-child(4) { animation-delay: 90ms; }
.result-card.card-enter:nth-child(5) { animation-delay: 120ms; }
.result-card.card-enter:nth-child(6) { animation-delay: 150ms; }
.result-card.card-enter:nth-child(7) { animation-delay: 180ms; }
.result-card.card-enter:nth-child(8) { animation-delay: 210ms; }
.result-card.card-enter:nth-child(n+9) { animation-delay: 240ms; }
```

## Repo conventions to follow

- Card template generation occurs in `static/js/results.js:renderCards()`.
- Result cards are placed inside `#results-list-items`.

## Steps

1. In `static/css/layout.css`, append the `.result-card.card-enter` rule and `@keyframes card-stagger-in` keyframe animation with 30ms increments.
2. In `static/js/results.js`, ensure newly appended card elements receive the `card-enter` class during render.
3. Under `@media (prefers-reduced-motion: reduce)`, verify that animation delays and translateY shifts are stripped to instant display.

## Boundaries

- Stagger animation must NEVER block user interaction (card clicks or checkbox selections must be instantly responsive while animating).
- Total stagger ceiling must not exceed 240ms.

## Verification

- **Mechanical**: Inspect cards in DOM during query response; verify `card-enter` class with cascaded `animation-delay`.
- **Feel check**: Filter by a state or sector. Observe the result list smoothly cascade into view.
- **Done when**: Search result cards enter with a crisp, sub-250ms waterfall cascade without stalling scrolling or selection.

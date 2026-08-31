# 003 — Optimize Score Indicator Radial Animation to Sub-300ms Budget

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: HIGH
- **Category**: Easing & Duration
- **Estimated scope**: 1 file (`static/css/components.css`)

## Problem

The radial confidence score ring (`.score-ring-fill`) transitions its SVG `stroke-dashoffset` over 800ms. In a high-frequency search and inspection tool, waiting nearly a full second for the score arc to finish animating creates perceived sluggishness when switching between company result cards.

```css
/* static/css/components.css:437-444 — current */
.score-ring-fill {
  fill: none;
  stroke: var(--primary);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 800ms var(--ease-spring);
}
```

## Target

Align the score arc animation with the Emil Kowalski UI budget (<300ms) and use the responsive `--ease-out` cubic-bezier curve:

```css
/* static/css/components.css:437-444 — target */
.score-ring-fill {
  fill: none;
  stroke: var(--primary);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--duration-normal) var(--ease-out);
}
```

## Repo conventions to follow

- Duration should use `--duration-normal` (300ms) or an explicit sub-300ms budget with `--ease-out`.

## Steps

1. In `static/css/components.css:442`, change `transition: stroke-dashoffset 800ms var(--ease-spring);` to `transition: stroke-dashoffset var(--duration-normal) var(--ease-out);`.

## Boundaries

- Do NOT alter SVG stroke math in `static/js/company.js` or `static/js/results.js`.
- Do NOT change `.score-ring` dimensions or stroke widths.

## Verification

- **Mechanical**: Inspect `.score-ring-fill` in DevTools; verify transition duration is 300ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Feel check**: Click various company cards in the results panel. Confirm the score ring fills rapidly and settles crisply before the user reads the numerical label.
- **Done when**: Score ring animation settles in ≤300ms without perceived lag.

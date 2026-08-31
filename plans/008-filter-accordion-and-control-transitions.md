# 008 — Implement Filter Accordion Grid Transitions and Basemap Pill Transitions

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: LOW
- **Category**: Missed opportunities, Cohesion & Tokens
- **Estimated scope**: 2 files (`static/css/layout.css`, `static/css/components.css`)

## Problem

1. In `static/css/layout.css:281-288`, `.filter-section.collapsed .filter-section-body` uses `display: none`. Toggling a filter section abruptly snaps the height of the entire sidebar filter panel.
2. In `static/css/components.css:938-968`, the floating basemap mode switcher (`.map-style-btn`) snaps background colors abruptly without visual continuity between active states.

```css
/* static/css/layout.css:281-288 — current */
.filter-section.collapsed .filter-section-arrow {
  transform: rotate(-90deg);
}

.filter-section.collapsed .filter-section-body {
  display: none;
}
```

## Target

1. Use modern CSS `grid-template-rows: 0fr -> 1fr` interpolation on `.filter-section-body-wrapper` for seamless height expansion without JavaScript measurement.
2. Add a sliding background pill transition on `.map-style-btn.active` and arrow rotation easing on `.filter-section-arrow`.

```css
/* static/css/layout.css — target */
.filter-section-arrow {
  font-size: 0.625rem;
  color: var(--text-tertiary);
  transition: transform var(--duration-fast) var(--ease-out);
}

.filter-section-body-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--duration-fast) var(--ease-out);
}

.filter-section.collapsed .filter-section-body-wrapper {
  grid-template-rows: 0fr;
}

.filter-section-body {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* static/css/components.css — target */
.map-style-btn {
  padding: 0 12px;
  height: 28px;
  font-size: 0.6875rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  border-radius: var(--radius-btn-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: color var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}
```

## Repo conventions to follow

- Filter collapse state is toggled in `static/js/filters.js` via the `.collapsed` class on `.filter-section`.

## Steps

1. In `static/css/layout.css`:
   - Replace the `display: none` rule for `.filter-section.collapsed .filter-section-body` with the CSS grid row transition `grid-template-rows: 0fr -> 1fr`.
   - Update `.filter-section-arrow` to use `var(--ease-out)`.
2. In `templates/index.html`, wrap the contents of `.filter-section-body` in a `.filter-section-body-wrapper` element (or apply the grid class directly to the parent container).
3. In `static/css/components.css`, update `.map-style-btn` active transitions for snappy state switching.

## Boundaries

- Do NOT alter filter selection logic or query serialization in `static/js/filters.js`.
- Do NOT touch MapLibre basemap style URL loading.

## Verification

- **Mechanical**: Toggle filter accordion headers in the sidebar; inspect computed heights in DevTools during transition.
- **Feel check**: Click "Industry Sectors", "Company Scale", and "State / Region" headers. Confirm smooth accordion unfolding without layout jumps. Switch between Dark / Streets / Satellite modes and observe immediate visual feedback.
- **Done when**: Filter sections collapse smoothly in ≤180ms and basemap controls switch states with tactile ease.

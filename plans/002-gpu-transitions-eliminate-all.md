# 002 — Eliminate `transition: all` and Migrate to Explicit GPU Properties

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 3 files (`static/css/layout.css`, `static/css/components.css`, `static/css/map.css`)

## Problem

`transition: all` is declared on multiple interactive components. This unbounded wildcard animates every computed style change (including margins, padding, box-shadows, and text colors), triggering excessive CPU style recalculations and composite paint cycles during user interaction.

```css
/* static/css/layout.css:105 — current */
.header-nav-item {
  transition: all var(--duration-fast) var(--ease-spring);
}

/* static/css/components.css:807, 834, 895, 953, 994 — current */
.radar-polygon {
  transition: all var(--duration-normal) var(--ease-spring);
}
.map-legend-panel {
  transition: all var(--duration-normal) var(--ease-spring);
}
.legend-item {
  transition: all var(--duration-fast) var(--ease-spring);
}
.map-style-btn {
  transition: all var(--duration-fast) var(--ease-spring);
}
.facility-tab-btn {
  transition: all var(--duration-fast) var(--ease-spring);
}

/* static/css/map.css:582 — current */
.sidebar-expand-pill {
  transition: all var(--duration-fast) var(--ease-spring);
}
```

## Target

Replace every occurrence of `transition: all` with targeted, explicit properties:

```css
/* static/css/layout.css:105 — target */
.header-nav-item {
  transition: color var(--duration-fast) var(--ease-spring),
              background var(--duration-fast) var(--ease-spring),
              border-color var(--duration-fast) var(--ease-spring);
}

/* static/css/components.css — target */
.radar-polygon {
  transition: polygon var(--duration-fast) var(--ease-spring),
              fill var(--duration-fast) var(--ease-spring),
              stroke var(--duration-fast) var(--ease-spring);
}
.map-legend-panel {
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-spring);
}
.legend-item {
  transition: color var(--duration-fast) var(--ease-spring),
              background var(--duration-fast) var(--ease-spring),
              border-color var(--duration-fast) var(--ease-spring);
}
.map-style-btn {
  transition: color var(--duration-fast) var(--ease-spring),
              background var(--duration-fast) var(--ease-spring),
              border-color var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-spring);
}
.facility-tab-btn {
  transition: color var(--duration-fast) var(--ease-spring),
              background var(--duration-fast) var(--ease-spring),
              border-color var(--duration-fast) var(--ease-spring);
}

/* static/css/map.css:582 — target */
.sidebar-expand-pill {
  transition: color var(--duration-fast) var(--ease-spring),
              background var(--duration-fast) var(--ease-spring),
              border-color var(--duration-fast) var(--ease-spring),
              transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-spring);
}
```

## Repo conventions to follow

- Existing multi-property transitions (e.g. `layout.css:405` `.result-card`) explicitly comma-separate each target property with shared token durations.

## Steps

1. In `static/css/layout.css:105`, replace `transition: all ...` with transitions for `color`, `background`, and `border-color`.
2. In `static/css/components.css`:
   - Line 807 (`.radar-polygon`): replace `all` with `polygon, fill, stroke`.
   - Line 834 (`.map-legend-panel`): replace `all` with `opacity, transform, box-shadow`.
   - Line 895 (`.legend-item`): replace `all` with `color, background, border-color`.
   - Line 953 (`.map-style-btn`): replace `all` with `color, background, border-color, box-shadow`.
   - Line 994 (`.facility-tab-btn`): replace `all` with `color, background, border-color`.
3. In `static/css/map.css:582`, replace `all` on `.sidebar-expand-pill` with `color, background, border-color, transform, box-shadow`.

## Boundaries

- Do NOT touch MapLibre canvas or layer paint properties.
- Do NOT change component HTML or IDs.

## Verification

- **Mechanical**: Run ripgrep for `transition:\s*all` in `static/css/` and confirm 0 matches.
- **Feel check**: Hover rapidly across header nav items, legend items, and basemap switcher buttons. Confirm that hover styling snaps smoothly without frame drops.
- **Done when**: `grep -rn "transition: all" static/css` returns zero lines.

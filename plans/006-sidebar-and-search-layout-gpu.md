# 006 — Migrate Sidebar Collapse and AI Search Bar to GPU-Accelerated Layout

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: HIGH
- **Category**: Performance, Physicality & Origin
- **Estimated scope**: 3 files (`static/css/layout.css`, `static/css/map.css`, `static/js/app.js`)

## Problem

1. In `static/css/layout.css:174`, `#sidebar` transitions `width var(--duration-normal)`. Animating layout width causes browser document reflow and repeatedly invalidates the MapLibre WebGL canvas on every tick, causing frame drops during sidebar toggling.
2. In `static/css/map.css:539`, `.ai-chat-bar` transitions `width var(--duration-normal)`, triggering text wrapping recalcs across the top of the map.
3. During sidebar transition, MapLibre GL JS must be notified via `map.resize()` at the end of the transition so the map coordinate projection space exactly matches the resized container without warping marker positions.

```css
/* static/css/layout.css:174-177 — current */
#sidebar {
  width: var(--sidebar-width);
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--separator);
  background: var(--bg);
  flex-shrink: 0;
  position: relative;
  z-index: var(--z-base);
  overflow: hidden;
  transition: width var(--duration-normal) var(--ease-spring),
              opacity var(--duration-fast) var(--ease-spring);
  will-change: width, opacity;
}

/* static/css/map.css:539-541 — current */
.ai-chat-bar {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: min(480px, calc(100% - 390px));
  max-width: 480px;
  z-index: 30;
  transition: width var(--duration-normal) var(--ease-spring),
              box-shadow var(--duration-normal) var(--ease-spring);
}
```

## Target

1. Use fixed width with margin-left negative offset or transform translation for the sidebar, ensuring the transition runs cleanly off the main thread.
2. Ensure `static/js/app.js` triggers `map.resize()` after the transition completes so marker tags match the updated viewport coordinates instantly.
3. Remove continuous width transition from `.ai-chat-bar` and transition `box-shadow` and `border-color` on focus.

```css
/* static/css/layout.css — target */
#sidebar {
  width: var(--sidebar-width);
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--separator);
  background: var(--bg);
  flex-shrink: 0;
  position: relative;
  z-index: var(--z-base);
  overflow: hidden;
  transition: margin-left var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out);
  will-change: margin-left, opacity;
}

#sidebar.collapsed {
  margin-left: calc(-1 * var(--sidebar-width)) !important;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

/* static/css/map.css — target */
.ai-chat-bar {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: min(480px, calc(100% - 390px));
  max-width: 480px;
  z-index: 30;
  transition: box-shadow var(--duration-fast) var(--ease-out);
}
```

## Repo conventions to follow

- Sidebar toggle logic is handled in `static/js/app.js` via the `#sidebar-toggle-btn` and `.sidebar-expand-pill` event listeners.

## Steps

1. In `static/css/layout.css`:
   - Replace `transition: width ...` with `transition: margin-left var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out);`.
   - Update `#sidebar.collapsed` to use `margin-left: calc(-1 * var(--sidebar-width)) !important;`.
2. In `static/css/map.css`:
   - In `.ai-chat-bar` (line 539), remove `width` from the transition property.
3. In `static/js/app.js`:
   - In the sidebar toggle handler, ensure `window.trinetMap?.map?.resize()` is scheduled after `190ms` (matching `--duration-fast`).

## Boundaries

- Do NOT alter MapLibre GL JS marker layer configurations.
- Map canvas element `#map` must fill 100% height and width of `#map-container`.

## Verification

- **Mechanical**: Toggle sidebar collapse and expand via UI buttons. Check DevTools Performance timeline; verify zero layout shift / paint spikes during the animation.
- **Feel check**:
  - Zoom in on a city cluster of factory pins.
  - Click the sidebar toggle to collapse the sidebar.
  - Verify map expands to full screen smoothly and **all map pins instantly remain locked to their exact geographic coordinates**.
- **Done when**: Sidebar collapses at 60fps and map markers stay 100% aligned with geographical coordinates throughout the motion.

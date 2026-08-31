# 005 — Ground Cluster Card Expansion and Coordinate Attachment Stability

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: HIGH
- **Category**: Physicality & Origin, Purpose & Frequency
- **Estimated scope**: 1 file (`static/css/map.css`)

## Problem

1. When hovering a geographic cluster marker on the map, `.trinet-expanded-card` scales up from `scale(0.7)`. This low scale factor makes the card look like it pops out of thin air rather than expanding smoothly from the pie circle.
2. The cluster marker applies `transition: z-index 0.12s ease;`. `z-index` cannot be continuously transitioned with easing curves, causing unnecessary style recalculations.
3. MapLibre GL JS attaches `.trinet-cluster-node` elements to geographic coordinates using inline `transform: translate3d(x, y, 0)`. Inner animations must never overwrite or collide with the root marker's coordinate transforms, or map pins will detach and drift during map panning/zooming.

```css
/* static/css/map.css:66-74, 153-177 — current */
.trinet-cluster-node {
  position: absolute !important;
  cursor: pointer;
  user-select: none;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  z-index: 10;
  transition: z-index 0.12s ease;
  pointer-events: auto;
}

.trinet-expanded-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.7);
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  min-width: 220px;
  max-width: 280px;
  padding: 10px 14px 11px 14px;
  border-radius: 14px;
  background: rgba(10, 14, 22, 0.96);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  color: #FFFFFF;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 160, 108, 0.35);
  transition: transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease, visibility 0.2s;
  display: flex;
  flex-direction: column;
  gap: 7px;
  white-space: nowrap;
  line-height: 1.3;
}
```

## Target

1. Remove `transition: z-index` on `.trinet-cluster-node`.
2. Ground `.trinet-expanded-card` entrance at `scale(0.94)` with opacity transition, maintaining its centered anchor `translate(-50%, -50%)`.
3. Ensure `.trinet-pie-circle` shrinks smoothly to `scale(0.85)` on hover without disturbing the outer container.

```css
/* static/css/map.css — target */
.trinet-cluster-node {
  position: absolute !important;
  cursor: pointer;
  user-select: none;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  z-index: 10;
  pointer-events: auto;
}

.trinet-cluster-node:hover {
  z-index: 100;
}

.trinet-pie-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 3.5px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
  will-change: transform, opacity;
}

.trinet-cluster-node:hover .trinet-pie-circle {
  transform: scale(0.88);
  opacity: 0;
}

.trinet-expanded-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.94);
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  min-width: 220px;
  max-width: 280px;
  padding: 10px 14px 11px 14px;
  border-radius: 14px;
  background: rgba(10, 14, 22, 0.96);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  color: #FFFFFF;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 160, 108, 0.35);
  transition: transform var(--duration-fast) var(--ease-out),
              opacity var(--duration-fast) var(--ease-out),
              visibility var(--duration-fast);
  display: flex;
  flex-direction: column;
  gap: 7px;
  white-space: nowrap;
  line-height: 1.3;
}

.trinet-cluster-node:hover .trinet-expanded-card {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}
```

## Repo conventions to follow

- All cluster markers and pin elements use two-tier DOM architecture:
  - **Outer wrapper** (`.trinet-cluster-node`, `.trinet-map-pin`): Managed exclusively by MapLibre GL JS for coordinate translation.
  - **Inner children** (`.trinet-pie-circle`, `.trinet-expanded-card`, `.trinet-pin-svg`): Styled and animated in CSS.

## Steps

1. In `static/css/map.css`:
   - Remove `transition: z-index 0.12s ease;` from `.trinet-cluster-node` (line 72).
   - In `.trinet-expanded-card` (line 157), change `scale(0.7)` to `scale(0.94)`.
   - Update transition on `.trinet-expanded-card` (line 171) to use `var(--duration-fast)` (180ms) and `var(--ease-out)`.
   - In `.trinet-cluster-node:hover .trinet-pie-circle` (line 180), change `scale(0.65)` to `scale(0.88)` with tokenized transitions.

## Boundaries

- **CRITICAL**: Never set or modify CSS `transform` on `.trinet-cluster-node` or `.maplibregl-marker`. MapLibre must retain 100% control over the outer node's coordinate `translate3d`.
- Do NOT change marker positioning offset logic in `static/js/map.js`.

## Verification

- **Mechanical**: Inspect cluster DOM in DevTools; verify `.trinet-cluster-node` retains its inline coordinate translate while inner card smoothly morphs.
- **Feel check**:
  - Hover over cluster nodes at State and City levels.
  - Pan and zoom the map continuously while hovering markers.
  - **Confirm map tags stay firmly pinned to their geographic coordinates without floating, drifting, or jumping across the screen.**
- **Done when**: Cluster cards expand naturally from `scale(0.94)` and geographic anchor points remain rock-solid during camera movement.

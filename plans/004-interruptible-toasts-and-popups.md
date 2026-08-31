# 004 — Make Toast Notifications and Map Popups Interruptible and Anchored

- **Status**: DONE
- **Commit**: 4f7b3c3
- **Severity**: MEDIUM
- **Category**: Interruptibility, Physicality & Origin
- **Estimated scope**: 2 files (`static/css/components.css`, `static/css/map.css`)

## Problem

1. Toast notifications use CSS `@keyframes toast-in` / `@keyframes toast-out`. When multiple toasts arrive or are dismissed in rapid succession, `@keyframes` cannot retarget smoothly mid-animation and restart from `y: 16px` at zero opacity, creating visual stutter.
2. Facility popup cards on the map (`.facility-popup`) animate with `@keyframes popup-in` and `--ease-spring-bounce`, lacking an anchored `transform-origin`. As a result, the popup scales from its geometrical center rather than originating from the marker pin tip below it.

```css
/* static/css/components.css:514-537 — current */
.toast {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  pointer-events: auto;
  box-shadow: var(--shadow-float);
  animation: toast-in var(--duration-enter) var(--ease-spring-bounce) forwards;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes toast-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-8px) scale(0.95); }
}

/* static/css/map.css:344-355 — current */
.facility-popup {
  width: 320px;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--bg-elevated);
  animation: popup-in var(--duration-normal) var(--ease-spring-bounce) forwards;
}

@keyframes popup-in {
  from { opacity: 0; transform: scale(0.9) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
```

## Target

1. Convert `.toast` to interruptible transitions utilizing `@starting-style` with a smooth `--ease-out` curve.
2. For `.facility-popup`, enforce `transform-origin: bottom center` (so it grounds right to the MapLibre coordinate tip) and use a responsive sub-200ms ease-out entrance without bouncy oscillation.

```css
/* static/css/components.css — target */
.toast {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  pointer-events: auto;
  box-shadow: var(--shadow-float);
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-spring);
}

.toast.toast-entering {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.toast.toast-leaving {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
  pointer-events: none;
}

@starting-style {
  .toast {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
}

/* static/css/map.css — target */
.facility-popup {
  width: 320px;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--bg-elevated);
  transform-origin: bottom center;
  animation: popup-in var(--duration-fast) var(--ease-out) forwards;
}

@keyframes popup-in {
  from { opacity: 0; transform: scale(0.95) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
```

## Repo conventions to follow

- Map popups are wrapped inside MapLibre's `.maplibregl-popup` container. Inner styling must not overwrite `.maplibregl-popup`'s inline `translate3d(x, y, 0)` translation coordinates.

## Steps

1. In `static/css/components.css`:
   - Replace `@keyframes toast-in` / `@keyframes toast-out` on `.toast` with CSS transitions and `@starting-style`.
   - Ensure dismissal classes smoothly interpolate opacity and transform.
2. In `static/css/map.css`:
   - Update `.facility-popup` to specify `transform-origin: bottom center;`.
   - Update `@keyframes popup-in` to animate over `var(--duration-fast)` (180ms) with `var(--ease-out)`, starting from `scale(0.95) translateY(6px)`.

## Boundaries

- Do NOT modify `.maplibregl-popup` wrapper positioning or MapLibre popup anchor calculation logic in `static/js/map.js`.
- The transform animation applies strictly to the inner card `.facility-popup`.

## Verification

- **Mechanical**: Verify `.toast` and `.facility-popup` CSS rules in DevTools.
- **Feel check**:
  - Click multiple map pins in succession. Confirm that the popup card expands from the pin tip without bouncy vibrations or coordinate detachment.
  - Trigger successive export notifications; confirm each toast slides in seamlessly without restarting or snapping other active toasts.
- **Done when**: Toasts retarget smoothly and map popups expand directly anchored to their coordinate pin.

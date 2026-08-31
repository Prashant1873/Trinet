# Animation Improvement Plans

Prioritized implementation plans for TRINET™ MSME Finder, crafted to Emil Kowalski's design engineering standards.

## Plan Catalog

| Plan | Title | Severity | Category | Status | Dependencies |
|---|---|---|---|---|---|
| [001](001-tokens-and-reduced-motion.md) | Define Animation Tokens and Global Accessibility Gating | **HIGH** | Accessibility, Tokens | **DONE** | None |
| [002](002-gpu-transitions-eliminate-all.md) | Eliminate `transition: all` and Migrate to Explicit GPU Properties | **HIGH** | Performance | **DONE** | 001 |
| [003](003-score-ring-duration-budget.md) | Optimize Score Indicator Radial Animation to Sub-300ms Budget | **HIGH** | Easing & Duration | **DONE** | 001 |
| [004](004-interruptible-toasts-and-popups.md) | Make Toast Notifications and Map Popups Interruptible and Anchored | **MEDIUM** | Interruptibility, Origin | **DONE** | 001 |
| [005](005-grounded-cluster-card-entrance.md) | Ground Cluster Card Expansion and Coordinate Attachment Stability | **HIGH** | Physicality & Origin | **DONE** | 001 |
| [006](006-sidebar-and-search-layout-gpu.md) | Migrate Sidebar Collapse and AI Search Bar to GPU-Accelerated Layout | **HIGH** | Performance, Physicality | **DONE** | 001 |
| [007](007-results-list-stagger-entrance.md) | Implement Staggered List Entrance for Company Search Results | **LOW** | Missed Opportunities | **DONE** | 001 |
| [008](008-filter-accordion-and-control-transitions.md) | Implement Filter Accordion Grid Transitions and Basemap Pill Transitions | **LOW** | Missed Opportunities | **DONE** | 001 |

## Recommended Execution Order

1. **Foundations First**: Execute [`001-tokens-and-reduced-motion.md`](001-tokens-and-reduced-motion.md) to define `--duration-enter`, `--ease-out`, and accessibility fallbacks that subsequent plans reference.
2. **Performance & Clean-up**: Execute [`002-gpu-transitions-eliminate-all.md`](002-gpu-transitions-eliminate-all.md) and [`003-score-ring-duration-budget.md`](003-score-ring-duration-budget.md) to eliminate GPU bottlenecks and long delays.
3. **Map Pin Anchoring & Physicality**: Execute [`005-grounded-cluster-card-entrance.md`](005-grounded-cluster-card-entrance.md), [`004-interruptible-toasts-and-popups.md`](004-interruptible-toasts-and-popups.md), and [`006-sidebar-and-search-layout-gpu.md`](006-sidebar-and-search-layout-gpu.md). These guarantee MapLibre marker coordinates remain completely pinned and drift-free during all interactions.
4. **Additive Polish**: Execute [`007-results-list-stagger-entrance.md`](007-results-list-stagger-entrance.md) and [`008-filter-accordion-and-control-transitions.md`](008-filter-accordion-and-control-transitions.md) for waterfall result cascade and smooth filter accordions.

## Map Marker Invariance Note

All map-related animation fixes strictly respect MapLibre GL JS's coordinate projection architecture:
- **Outer marker elements** (`.trinet-cluster-node`, `.trinet-map-pin`, `.facility-marker`) maintain untouched inline `translate3d(x, y, 0)` coordinates.
- **Inner elements** (`.trinet-pie-circle`, `.trinet-expanded-card`, `.facility-popup`) receive transforms with explicit `transform-origin` anchoring.
- Sidebar toggles trigger `map.resize()` on animation completion to ensure coordinate accuracy across window dimensions.

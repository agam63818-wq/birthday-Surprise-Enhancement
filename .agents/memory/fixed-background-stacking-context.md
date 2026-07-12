---
name: Fixed ambient background hides unpositioned content
description: A page-wide `position: fixed` decorative layer (canvas/stars) can visually cover plain in-flow content even though it's earlier in the DOM and has a low z-index.
---

If a global `position: fixed` background component (e.g. an animated canvas)
is mounted above the app's routes, any sibling/descendant content that has
**no explicit `position` set** will render *underneath* it visually — even
though the background is earlier in the DOM and its own z-index is low (0/1).

**Why:** per CSS stacking rules, positioned elements (even with `z-index: 0`)
always paint above unpositioned in-flow content, regardless of DOM order or
the numeric z-index value. Only elements that are themselves positioned
compete with the background by z-index.

**How to apply:** every top-level page/section wrapper that sits inside a
layout with a fixed decorative background must set
`position: relative; z-index: 5` (or similar) — do this by convention, not
just where a bug was noticed. Symptom when missed: content is present and
correctly styled in the DOM (computed styles look fine — visible, non-zero
size, correct color) but is invisible in a real screenshot/viewport; a
debug/test harness that happens to wrap the content in a positioned container
can mask the bug and give a false "it renders fine" signal.

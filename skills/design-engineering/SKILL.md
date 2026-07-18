---
name: design-engineering
description: Apply interface craft when building or reviewing UI - motion, easing, timing, springs, component feel, and visual foundations. Use when building a component, animation, transition, hover or press state, modal, drawer, toast, or when polishing an interface so it feels right. Says "make this feel better", "add an animation", "polish the UI", "review this component".
---

# design-engineering

In a world where most software works well enough, feel is the differentiator.
Most of what makes an interface feel right is detail the user never
consciously notices - the aggregate of small correct choices. Build for that
aggregate.

## Motion decision framework

Answer these in order before writing any animation.

### 1. Should it animate at all?

The deciding factor is frequency. The more often a user sees it, the less it
should move.

| How often the user sees it | Decision |
|----------------------------|----------|
| 100+ times/day (shortcuts, command palette) | No animation, ever |
| Tens of times/day (hover, list nav) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare or first-time (onboarding, celebration) | Room for delight |

Never animate a keyboard-initiated action. It repeats all day; animation makes
it feel slow and disconnected from the keypress.

### 2. What is the purpose?

Every animation needs an answer to "why does this move?" Valid ones: spatial
consistency (enters and exits the same edge), state change, feedback (a press
that confirms the interface heard you), or preventing a jarring appear/disappear.
"It looks cool" is not a purpose for anything the user sees often.

### 3. What easing?

- Entering or exiting -> `ease-out` (fast start, feels responsive).
- Moving or morphing on screen -> `ease-in-out`.
- Hover or color change -> `ease`.
- Constant motion (marquee, progress) -> `linear`.

Never use `ease-in` for UI. It delays the first moment of movement - exactly
when the user is watching - so a 300ms `ease-in` dropdown feels slower than a
300ms `ease-out` one. The built-in curves are weak; use stronger custom ones:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);       /* UI interactions */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* iOS-like drawer */
```

### 4. How fast?

| Element | Duration |
|---------|----------|
| Button press feedback | 100-160ms |
| Tooltip, small popover | 125-200ms |
| Dropdown, select | 150-250ms |
| Modal, drawer | 200-500ms |

Keep frequent, interactive UI under 300ms; the modal and drawer range above (up to 500ms) is the deliberate exception for occasional, first-time surfaces. Perceived speed is real: a faster spinner makes
a load feel faster at the same load time, and an instant tooltip after the first
one makes a whole toolbar feel quick.

## Springs

Springs settle on physics, not a fixed duration, so they feel alive and, unlike
CSS keyframes, keep their velocity when interrupted. Reach for them on drag and
gesture interactions the user can reverse mid-motion, and on decorative,
mouse-tracked motion. Keep bounce subtle (0.1 to 0.3) and usually absent - save
it for drag-to-dismiss and playful moments, not functional UI.

## Component feel

- **Press feedback.** Any pressable element gets `transform: scale(0.97)` on
  `:active` with a ~160ms `ease-out` transition. Subtle (0.95 to 0.98); it makes
  the interface feel like it is listening.
- **Never animate from `scale(0)`.** Nothing real appears from nothing. Start at
  `scale(0.9)` or higher plus opacity so the entrance has shape.
- **Scale from the trigger.** Popovers and dropdowns scale from their origin, not
  their center. Modals stay centered.
- **Respect `prefers-reduced-motion`.** Drop or shorten non-essential motion.

## Visual foundations

- One spacing scale, one type scale. Consistency reads as intent; ad-hoc values
  read as noise.
- Restrained color: a small palette with clear roles beats many accents.
- Make every interactive state explicit - hover, active, focus-visible, disabled.
  A control with no states feels dead.

## Review format

When reviewing UI code, output a single markdown table, one row per issue, with
`Before | After | Why`. Do not use separate "Before:" / "After:" lines.

| Before | After | Why |
|--------|-------|-----|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Name exact properties; avoid `all` |
| `transform: scale(0)` | `scale(0.95); opacity: 0` | Nothing appears from nothing |
| `ease-in` on a dropdown | strong `ease-out` | `ease-in` reads as sluggish |
| no `:active` state | `scale(0.97)` on `:active` | Presses must feel responsive |

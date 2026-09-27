# Warka Furniture — design system

The single source of truth is `src/styles/tokens.css`; this file explains how
to use it. The project uses **CSS modules + CSS custom properties**, not
Tailwind — every rule below is expressed with tokens.

## Idea

A made-to-measure workshop. The one bold, recurring device is the **measuring
rule**: the entrance sequence (Measure → Build → Finish), the Craft Line page
transition, the tick marks on the hero board, the dimension diagram on product
pages. Everything around it stays quiet: gallery-white walls, near-black ink,
one metal (brass), real photographs framed close to their own size.

## Colour (semantic tokens)

| Token | Light | Use |
|---|---|---|
| `--bg` | `#faf9f7` | page (gallery wall) |
| `--bg-2` | `#ffffff` | raised surface, cards, inputs |
| `--bg-3` | `#f1eee9` | sunken / hover / muted surface |
| `--ink` | `#14110e` | primary text |
| `--ink-2` | `#57514a` | secondary text |
| `--ink-3` | `#706962` | muted text (still ≥ 4.5:1) |
| `--line`, `--line-strong` | ink at 12% / 24% | borders |
| `--ember` / `--ember-text` | `#7c4f26` / `#6e4520` | brass: accent fill / accent words |
| `--ok` `--warn` `--danger` `--info` | | status, each with a `-soft` tint |
| `--oak`, `--oak-soft` | `#b98b5e` | **material only** — entrance, hero board, craft line |
| `--ink-on-oak` | `#14110e` | text on the oak; does **not** flip with the theme |
| `--on-danger` | `#fff` / dark `#1b1614` | text on a filled danger button |
| `--on-photo` | `#faf9f7` | text or highlights over photographs; does not flip |

Dark theme redefines every token under `:root[data-theme='dark']`.
Never write a raw hex in a component.

## Type

- Display / headings: Playfair Display (`.dsp` + `.display` `.h1`–`.h4`).
- Body / UI: Inter. Amharic: Noto Sans Ethiopic via `.am` + `lang="am"`.
- Scale: `--text-display` → `--text-micro` (clamped, 1.25 ratio).
- Section intro line: `.kicker` — Playfair italic, brass, sentence case.
  No tracked all-caps eyebrows.
- Prices and any compared number: `.nums` (tabular figures).

## Space

4px grid only: `--space-1` (4) … `--space-10` (128). Every padding, margin
and gap in the stylesheets is a multiple of 4px (1–2px hairline nudges and
fluid `clamp()` values excepted). Sections use `.section` (56–120px).
Siblings are spaced with `gap`, not per-child margins.

## Depth (three levels)

Exactly three levels, no fourth:

| Level | Token | Use |
|---|---|---|
| 0 flat | `1px solid var(--line)` | default containers |
| 1 | `--shadow-1` | at rest |
| 2 | `--shadow-2` | hovered, dropdowns, popovers, pinned prints |
| 3 | `--shadow-3` | dialogs, drawers, the toast, the hero plate |

Hover steps up exactly one level. Small inline things (badges, chips) get
no shadow. Dark theme uses the darker shadow set.

## Layers (z-index)

Always `var(--z-…)`; raw numbers only for ordering inside one component
(1, 2, 3, −1).

| Layer | Token | Value |
|---|---|---|
| sticky bars (admin settings bar) | `--z-sticky` | 40 |
| sticky header, mobile buy bar | `--z-header` | 50 |
| dropdowns / menus | `--z-menu` | 60 |
| drawers, dialogs, search (panel = +1 over its scrim) | `--z-dialog` | 200 |
| toast | `--z-toast` | 300 |
| craft line (navigation) | `--z-craftline` | 400 |
| entrance | `--z-intro` | 500 |
| skip link | `--z-skip` | 600 |

## Motion

- Tokens: `--ease-out`, `--dur-fast` (160), `--dur-base` (240), `--dur-slow` (420).
- Animate `transform` / `opacity` / `clip-path` only; list properties, never `all`.
- One orchestrated moment: the entrance, first homepage visit per session.
- Navigation: the Craft Line appears only when a navigation takes longer
  than ~150 ms. Skeletons (`loading.tsx`) fade in after a short delay, so a
  fast page never flashes a loader.
- `prefers-reduced-motion`: no entrance, no reveals, no line travel — the final
  state is shown immediately.

## Components

Buttons `ActionButton` (primary / ghost / sizes), inputs (`Fields`,
`.admin-input`), product card `ProductCard`, price `Price`, skeleton
`Skeleton`, route error `RouteError`, toast `BasketToast`, dialogs use
`role="dialog" aria-modal` + Escape + focus return + `overscroll-behavior: contain`.

## Interactive states

Every control: hover, `:focus-visible` ring (2px brass, never removed —
a box-shadow ring keeps a transparent outline so Windows high-contrast still
draws it; an input that drops its outline shows focus on its row with
`:focus-within`), active, disabled (`opacity .5`, not hidden). Colour changes
ease over `--dur-fast`; nothing snaps. An option that is already selected
does not need a hover change. Touch targets ≥ 44px on coarse pointers.
Text inputs use `:focus`; everything else `:focus-visible`.

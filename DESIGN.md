# Design

> Visual system for the PDF Page Editor (web). Product register — design serves the task. Source of truth is `src/index.css` (`@theme` tokens, Tailwind v4); this file documents intent so variants stay on-brand.

## Theme

**Soft Structuralism** — a light, silver-grey workspace with slate neutrals and a single warm amber accent. Reads as a precise, trustworthy tool (Acrobat's modern web workspace, not a free-utility site). Light mode is deliberate: users edit documents at a desk under normal light, comparing page thumbnails against a white PDF surface — a neutral-light chrome keeps the document the brightest thing on screen.

Color strategy: **Restrained** — tinted neutrals carry the chrome; amber appears only on primary actions, current selection, and state. No gradients, no glass except the two purposeful blurs (modal backdrop, card hover toolbar).

## Color

Slate neutral ramp on `#18181b`, silver-grey surfaces, amber accent. All values from `@theme` in `src/index.css`.

| Role | Token | Value |
|---|---|---|
| Body surface | `--color-surface-base` | `#f4f4f5` |
| Rail / recessed | `--color-surface-rail` | `#ececee` |
| Elevated (status line) | `--color-surface-elevated` | `#fafafa` |
| Card / content | `--color-surface-card` | `#ffffff` |
| Overlay (glass) | `--color-surface-overlay` | `rgba(255,255,255,.82)` |
| Ink (primary text/chrome) | `--color-chrome` | `#18181b` |
| Ink secondary | `--color-chrome-secondary` | `#3f3f46` |
| Ink muted | `--color-chrome-muted` | `#71717a` |
| Hairline | `--color-chrome-hairline` | `rgba(24,24,27,.09)` |
| **Accent** | `--color-accent` | `#d97706` (amber) |
| Accent hover | `--color-accent-hover` | `#b45309` |
| Accent surface | `--color-accent-surface` | `rgba(217,119,6,.08)` |
| Accent ring | `--color-accent-ring` | `rgba(217,119,6,.35)` |
| Success | `--color-success` | `#16a34a` |
| Danger | `--color-danger` | `#dc2626` |

**Semantics:** amber = primary action (Open PDF, Apply), current page selection ring emphasis, focus ring, busy bar, selection badge. Danger red only on destructive hover (remove page). Success reserved.

**Known deviation (candidate for critique):** the selected page card uses a **blue** ring (`#3b82f6`, `index.css:566`) rather than the amber accent — a carryover of the reference `.exe`'s blue selection convention. Defensible as a distinct "selection" semantic vs "action" amber, but it breaks the one-accent rule. Revisit in a `critique`/`polish` pass: either promote to a documented second semantic or unify to amber.

## Typography

**One family: Geist Variable** (`@fontsource-variable/geist`, bundled — no network). A well-tuned geometric sans carries brand, toolbar, labels, data, and modal prose. No display/body pairing (correct for product).

- Fixed rem/px scale, not fluid. Sizes: landing title 28px/700, modal title 15px/600, status 11.5px, toolbar buttons 12px/500, brand 13px/600, labels 11px.
- Negative tracking on headings (`-0.02em`→`-0.04em`); slight positive tracking on the offline badge / Apply (`0.03–0.04em`) for small-caps-like labels.
- Weights in use: 400 / 500 / 600 / 700 — real hierarchy, not just regular+bold.

## Components

State vocabulary is standardized: **default · hover · active (`scale(.97)`) · disabled (opacity .38–.45) · focus-visible (2px amber outline)**. Every interactive control implements the relevant subset.

- **Toolbar buttons** (`.btn-tool`): transparent → white card + `--shadow-tool` on hover; **icon + label** (inline `aria-hidden` SVGs, uniform 1.5 stroke, `currentColor` so they track text color/state). Grouped in pill containers (`.btn-group`) with dividers — actionable verbs left, supporting (page#/watermark/shrink/info, then undo/redo) continuing left; selection badge · export select · **Download** pinned right.
- **Primary** (`.btn-primary`, amber fill) / **Download** (`.btn-download`, ink fill) / **Apply** (`.btn-apply`, amber) — the three committing actions, each with tinted shadow.
- **Page card** (`.page-card`): white canvas-wrap, `--shadow-card`, lifts `-1px` on hover; per-card **glass hover toolbar** (pill, backdrop-blur) with Preview / Add text / Add picture / Rotate / Remove (danger). Selected = ring (see deviation above).
- **Modal** (`.modal-card`): "Double-Bezel" — outer shell (`surface-base`, 5px pad) wrapping inner white core; `--shadow-modal`, backdrop blur(6px), spring entrance.
- **Landing** (`.landing-hero`): logo + title + tagline, dashed **dropzone** that turns amber + ring on drag-active.
- **Empty / status**: `.empty-state`, `.status-line` (elevated surface, file · page-count).
- **Loading**: indeterminate amber **busy bar** under the toolbar (`aria-busy`), not a center spinner.

## Layout

- App shell: vertical flex — toolbar chrome (sticky, `z-10`) · status line · scrolling grid area.
- Page grid: `flex-wrap` of fixed 156px cards, 16px gap (not forced into an equal-column grid).
- Toolbar wraps (`flex-wrap`) on narrow widths; responsive behavior is structural, not fluid type.
- Radius scale: 6 / 10 / 16 / 22 / pill — tighter on inner elements, softer on containers.
- **z-index scale**: card-hover-toolbar `2` → toolbar-chrome `10` → modal-backdrop `50`. Semantic, no `9999`.

## Motion

- Durations: fast 120ms (button feedback) · base 200ms (backdrop) · slow 320ms (modal entrance). Within the 150–250ms product norm; conveys state, never decoration.
- Easing: `--ease-out-quart` for color/opacity, `--ease-spring` `cubic-bezier(.32,.72,0,1)` for transform/scale. No bounce/elastic.
- `active` press = `scale(.97)` everywhere for physical feedback.
- **Reduced motion:** TODO — no `@media (prefers-reduced-motion: reduce)` block yet. Add crossfade/instant fallbacks for modal-in, backdrop-in, busy-bar (flag for `harden`/`polish`).

## Assets

- Logo + favicon: `public/favicon.svg` (user's PDF-editor mark — blue creature with pencil). Used at 24px in toolbar, 64px on landing. **Never** an emoji placeholder.

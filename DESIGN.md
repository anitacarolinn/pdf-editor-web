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

The selected page-card ring uses the **amber accent** (unified to one accent; the earlier blue `.exe` carryover was removed). `selected: N` renders as an amber pill. **Export** is the single **green** (`--color-success`) commit action — the one deliberate non-amber, reserved for "produce the file".

## Typography

**One family: Geist Variable** (`@fontsource-variable/geist`, bundled — no network). A well-tuned geometric sans carries brand, toolbar, labels, data, and modal prose. No display/body pairing (correct for product).

- Fixed rem/px scale, not fluid. Sizes: landing title 28px/700, modal title 15px/600, status 11.5px, toolbar buttons 12px/500, brand 13px/600, labels 11px.
- Negative tracking on headings (`-0.02em`→`-0.04em`); slight positive tracking on the offline badge / Apply (`0.03–0.04em`) for small-caps-like labels.
- Weights in use: 400 / 500 / 600 / 700 — real hierarchy, not just regular+bold.

## Components

State vocabulary is standardized: **default · hover · active (`scale(.97)`) · disabled (opacity .38–.45) · focus-visible (2px amber outline)**. Every interactive control implements the relevant subset.

- **Toolbar buttons** (`.tbtn`): borderless, **icon-above-label** (ribbon), inline `aria-hidden` SVGs (18px, uniform 1.5 stroke, `currentColor`); hover reveals a subtle fill + amber icon; clusters separated by thin `.tb-sep` hairlines. Brand reads **PDF Editor** (no offline badge). Right side: amber `selected: N` pill · PDF-format select · green **Export** (`.tbtn-export`). Rotation is NOT on the main toolbar — it lives on the per-card hover toolbar and in the edit modal.
- **Edit modal toolbar**: light, icon-above-label `ToolBtn`s — Undo/Redo · New page/Delete/Duplicate · Rotate L/R · Move before/after · Zoom · Add text/Add picture/**Sign** — with **Restore / Cancel / Save & Close** (red) footer.
- **Page card** (`.page-card`, 200px): white canvas-wrap, `--shadow-card`, lifts on hover; `CardOverlayPreview` renders placed text/image/signature overlays read-only so edits show on the grid; per-card **glass hover toolbar** (Preview / Add text / Add picture / Rotate / Remove). Selected = amber ring.
- **Feature modals** (inline-styled, match the light aesthetic + amber): **ShrinkModal** (options → loading → size-preview → Apply), **SignatureModal** (draw pad → transparent-PNG overlay; Save & Close offers a signature-PNG download), **LockModal** (password → encrypt → download), **UnlockModal** (file + password → decrypt → open). Lock/unlock run fully client-side via `@neslinesli93/qpdf-wasm`.
- **Modal** (`.modal-card`): "Double-Bezel" — outer shell wrapping inner white core; `--shadow-modal`, backdrop blur, spring entrance.
- **Landing** (`.landing-hero`): logo + title + tagline, dashed **dropzone** that turns amber + ring on drag-active.
- **Empty / status**: `.empty-state`, `.status-line` (elevated surface, file · page-count).
- **Loading**: indeterminate amber **busy bar** under the toolbar (`aria-busy`), not a center spinner.

## Layout

- App shell: vertical flex — toolbar chrome (sticky, `z-10`) · status line · scrolling grid area.
- Page grid: `flex-wrap` of fixed 200px cards, 18px gap, capped at **6 columns** (`max-width: 1290px`).
- Toolbar wraps (`flex-wrap`) on narrow widths; responsive behavior is structural, not fluid type.
- Radius scale: 6 / 10 / 16 / 22 / pill — tighter on inner elements, softer on containers.
- **z-index scale**: card-hover-toolbar `2` → toolbar-chrome `10` → modal-backdrop `50`. Semantic, no `9999`.

## Motion

- Durations: fast 120ms (button feedback) · base 200ms (backdrop) · slow 320ms (modal entrance). Within the 150–250ms product norm; conveys state, never decoration.
- Easing: `--ease-out-quart` for color/opacity, `--ease-spring` `cubic-bezier(.32,.72,0,1)` for transform/scale. No bounce/elastic.
- `active` press = `scale(.97)` everywhere for physical feedback.
- **Reduced motion:** TODO — no `@media (prefers-reduced-motion: reduce)` block yet. Add crossfade/instant fallbacks for modal-in, backdrop-in, busy-bar (flag for `harden`/`polish`).

## Assets

- Logo + favicon: `public/favicon.svg` (user's PDF-editor mark). Brand wordmark is **"PDF Editor"** (toolbar + landing). Used at 24px in toolbar, 64px on landing. **Never** an emoji placeholder.

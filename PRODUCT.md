# Product

## Register

product

## Users

Two audiences, one interface:
- **The maker (primary):** works in an AI application / document team; edits PDFs like contracts, ID scans, and reports day to day. Reaches for this instead of a paid desktop tool. Wants the full page-editing workflow of the reference desktop app, in the browser, without uploading sensitive documents anywhere.
- **The public:** anyone who lands on the site needing to reorder, rotate, watermark, sign, or lock a PDF once, and leaves. They arrive with a file and a single job.

Context of use: desktop browser, keyboard + mouse, often handling confidential documents (rental contracts, ID cards). Privacy is not a feature, it's the premise — all processing is client-side.

## Product Purpose

A privacy-first, browser-based PDF page editor with **feature parity to the "PDF Page Editor v1.6.5" desktop app** plus additions the desktop tool lacks. Everything runs locally in the browser (no server upload): open/merge/split, delete/duplicate/reorder/rotate, extract/replace pages, page numbers, watermark, shrink file size, document info, and export. On top of parity: interactive text and image objects (movable, resizable, re-editable after Apply, CJK-capable), e-signature, and password lock/unlock.

Success = a user fluent in Adobe Acrobat / a paid PDF tool sits down, trusts it immediately, completes the task without hunting for a control, and never wonders whether their document left their machine. One codebase, later wrappable as a desktop app (Tauri).

## Brand Personality

Clean, precise, professional — a competent tool, not a toy. Three words: **trustworthy, unfussy, capable.** The voice is quiet and direct; the interface disappears into the task. It should feel closer to Acrobat's modern web workspace than to a free "PDF utility" site plastered with ads and upsells. Confidence through restraint, not decoration.

## Anti-references

- **The reference `.exe` at its most utilitarian** — respect its feature set and layout logic, but don't inherit a cramped, dated Win32 look.
- **Free-PDF-tool clutter** (iLovePDF/Smallpdf ad-heavy pages, upload-to-cloud flows) — the opposite of the privacy premise.
- **"Messy" / inconsistent toolbars** — the user's explicit complaint. No ungrouped button soup, no mismatched controls, no random emoji as brand marks (the turtle-emoji placeholder was rejected outright).
- **Generic AI-SaaS** — purple/blue gradients, hero-metric templates, three-equal-card rows, eyebrow kickers. Not this.

## Design Principles

1. **The tool disappears.** Earned familiarity over novelty. Standard affordances for standard tasks; a Acrobat user should never pause at a subtly-off control.
2. **Actionable left, supporting right.** Toolbar follows the Adobe workspace logic — page-editing verbs grouped on the left, document/export/state controls on the right.
3. **Privacy is visible.** The "offline / in your browser" promise is stated, not buried — it's the core differentiator.
4. **Non-destructive by default.** Edits (text, image, rotation) stay re-editable; nothing is baked until the user downloads. Undo/redo always available.
5. **One accent, many states.** Amber carries primary actions and current selection; a full state vocabulary (hover/focus/active/disabled/selected/loading/error) is standardized, not decorative.

## Accessibility & Inclusion

- Every interactive control has an accessible name (buttons carry `aria-label` / text; overlay objects and grid cards are labeled) — relied on by both users and the Playwright verification harness.
- Body and control text meets WCAG AA contrast on the light surface; the amber accent is used at accessible weights, never as full-saturation fill on inactive states.
- **CJK (中文) is a hard requirement** — text objects render Traditional/Simplified Chinese correctly (rasterized with a CJK font stack at flatten time, since standard PDF WinAnsi fonts can't encode it).
- `prefers-reduced-motion` respected: motion conveys state (150–250 ms), never choreography, and degrades to instant/crossfade.

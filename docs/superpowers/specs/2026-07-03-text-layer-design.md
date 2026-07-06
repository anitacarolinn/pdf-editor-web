# Text Layer — Select · Copy · Markup · Search · Extract

**Date:** 2026-07-03
**Status:** Awaiting user review
**Constraint:** 100% client-side (CSR). No server, no uploads — consistent with the project's privacy-first promise.

---

## 1. Goal

Add real text interaction to the PDF preview. Today pages render as a canvas bitmap only — there is no selectable text. This phase adds a **text layer** and the features it unlocks, all using libraries already bundled (`pdf.js`, `pdf-lib`):

1. **Select** text with the mouse (native selection highlight).
2. On selection, a **floating popup** with: **Copy**, **Highlight**, **Underline**, **Strikethrough**, **Search this text**.
3. **Markup** (highlight/underline/strikethrough) persists, survives undo/redo, and is burned into the PDF on export.
4. **Find in document** (Ctrl+F): match count, next/prev, on-page highlighting.
5. **Extract text**: copy the whole document's text, or download it as `.txt`.

**Multilingual by design.** `pdf.js` `getTextContent()` returns Unicode, so select/copy/extract work for **any script** in the PDF — Indonesian and English (Latin), 中文 (CJK), and others — not English only. Markup is language-independent (it draws rectangles, no glyphs). Two inherent limits, not caused by our code: (a) the PDF must contain real embedded text — *scanned/image-only* pages have nothing to select (that's the OCR future phase); (b) rare PDFs lacking a `ToUnicode` map display fine but copy garbled characters — a PDF-format limitation with no client-side fix short of OCR.

**Out of scope (future phases, each its own spec):** redaction, AcroForm filling, freehand/shape annotations, OCR for scanned PDFs, sticky-note comments.

---

## 2. Architecture

Keeps the golden rule: **UI components never import a PDF library — they call services.**

### New service: `src/services/text-service.ts` (framework-free)
Wraps `pdf.js` text APIs, mirrors the isolation style of `render-service.ts`.

- `renderTextLayer(page, viewport, container): { cancel(): void }`
  Builds pdf.js's transparent, positioned `<span>` overlay into `container`, aligned to the page canvas. Cancellable like `renderPageToCanvas`.
- `getPageText(page): Promise<string>`
  Plain text of one page (used by extract).
- `searchDocument(doc, query, opts): Promise<SearchHit[]>`
  `SearchHit = { pageIndex: number; rects: RectPct[] }`. Case-insensitive by default. Cross-item matches produce one rect per overlapping text item.

### New store: `src/services/markup-store.ts` (zustand, mirrors `overlay-store.ts`)
```ts
type MarkupType = 'highlight' | 'underline' | 'strikethrough'
interface MarkupObject {
  id: string
  page: number            // 0-based, matches overlay-store convention
  type: MarkupType
  color: string           // hex, default '#ffd54a' for highlight
  rects: RectPct[]        // one selection can span multiple lines → multiple rects
}
// RectPct = { xPct, yPct, wPct, hPct }  — page-relative, zoom-independent (same convention as OverlayObject)
```
API: `addMarkup(page, type, color, rects) → id`, `removeMarkup(id)`, `clear()`, `markupForPage(objects, page)`. Undo/redo is wired the same way `overlay-store` is (see §6).

### Coordinate helper: extend `src/services/overlay-coords.ts`
Add `rectPctToPdfRotated(rect, pw, ph, rotationDeg)` reusing the existing rotation math so markup maps to PDF points exactly like overlay objects do.

### Export: extend `src/services/flatten.ts`
`flattenObjects(bytes, objects, markup)` — after drawing overlays, draw each markup:
- **highlight** → `page.drawRectangle({ ..., color, opacity: 0.4 })` over the text (text is already in page content, so it shows through like a real highlighter).
- **underline** → thin filled rect at the rect's baseline.
- **strikethrough** → thin filled rect at the rect's vertical middle.
`export-service.ts` passes the markup store's objects through to `flattenObjects`.

### Download helper: `src/services/file-io.ts`
Add `downloadText(text, fileName)` (or generalize `downloadBytes` with a MIME param) for the `.txt` export. `downloadBytes` currently hard-codes `application/pdf`.

---

## 3. Components

### `PageCanvas.tsx` — layer stack (preview only)
Add an opt-in `selectable` prop. When set (full-page preview, **not** thumbnails/grid), render three stacked layers inside a positioned wrapper:

```
wrapper (position: relative)
├─ <canvas>        z0   the rendered bitmap (unchanged)
├─ text layer div  z1   transparent selectable spans   (pointer-events: auto)
│                       drag-selection styled via ::selection → neutral grey (temporary; not persisted)
├─ markup layer    z2   highlight/underline/strike divs (pointer-events: auto for delete)
└─ OverlayLayer    z3   existing annotations            (pointer-events per object)
```
Thumbnails keep today's canvas-only path (`selectable` omitted).

### `SelectionPopup.tsx` (new)
- Listens to `selectionchange` / mouse-up within the text layer.
- Reads `window.getSelection()`, computes a bounding rect, positions itself just above the selection.
- Buttons: Copy · Highlight · Underline · Strikethrough · Search this text.
- **Highlight color UX:** the **Highlight** button applies the **default color (yellow `#ffd54a`) on a single click**; a small **swatch row** beside it (yellow · green · pink · blue) lets the user pick another color. No full hex picker in Phase 1 (can add later).
- **Copy** → `navigator.clipboard.writeText(selection)`.
- **Highlight/Underline/Strikethrough** → convert the selection's client rects to `RectPct` (relative to the page wrapper) → `markup-store.addMarkup(...)`.
- **Search this text** → push selection into the search bar (below) and run it.
- Dismiss on click-outside / Escape / empty selection.

### `MarkupLayer.tsx` (new, mirrors `OverlayLayer.tsx`)
Renders `markupForPage(...)` as absolutely-positioned divs from `RectPct`. Highlight = semi-transparent fill; underline/strike = thin bar. Click a markup → small delete affordance (reuse the overlay select/delete pattern).

### `SearchBar.tsx` (new)
- Opened via Ctrl+F (and a Toolbar button).
- Input + "3 / 12" match count + next/prev + close.
- Calls `text-service.searchDocument`, stores hits, scrolls the active hit into view, renders hit rects on a search-highlight layer (can reuse `MarkupLayer`'s rect-rendering with a distinct transient color; hits are **not** persisted to the markup store).

### `Toolbar.tsx`
Add **Search** (opens `SearchBar`) and **Extract text** (copy-all / download `.txt`) actions, following the existing toolbar button pattern and i18n (`i18n.tsx`, EN + 繁體中文).

---

## 4. Data flow

1. **Render:** canvas renders at `scale * dpr` (unchanged). Text layer builds from `page.getTextContent()` using the viewport at **`scale`** (CSS px). The wrapper is CSS-sized to `scale` so spans land exactly on glyphs at every zoom level. *(This alignment is the main risk — see §5.)*
2. **Select → markup:** selection client rects → page-relative `RectPct` → `markup-store`. `MarkupLayer` re-renders. Undo/redo tracked (§6).
3. **Export:** `export-service` → `flattenObjects(bytes, overlays, markup)` → markup drawn into the PDF via `pdf-lib`.
4. **Search:** `searchDocument` walks pages' text content, computes hit rects, renders transient highlights, scroll-to on next/prev.
5. **Extract:** `getPageText` across pages → clipboard or `downloadText`.

---

## 5. The main risk: text-layer alignment

Text spans must sit exactly on the rendered glyphs at all zoom levels. pdf.js's `TextLayer` handles this **only if fed the same viewport geometry as the canvas**. The canvas renders at `scale * dpr`; the text layer must use `scale` (CSS px) and the wrapper must be CSS-sized to the `scale` viewport (matching how `renderPageToCanvas` already sets `canvas.style.width/height = viewport.width/dpr`). Getting this wrong makes selection land on the wrong words.

**Mitigation:** encapsulate all geometry in `text-service.renderTextLayer` (single source of truth), and validate alignment with a Playwright test in a real browser (jsdom can't measure layout).

---

## 6. Undo / redo

Markup is user-editable state, so it must participate in undo/redo the same way overlays do. Investigate how `document-store`/`overlay-store` are currently coupled to undo/redo during implementation and wire `markup-store` in identically. If overlays are **not** yet in the undo stack, match their behavior (don't expand scope to fix undo for overlays here) and note it.

---

## 7. Testing (test-first, Vitest + Testing Library; Playwright for layout)

- `text-service.test.ts` — `getPageText` returns expected text from a fixture; `searchDocument` returns correct hit count and page indices; case-insensitive default; empty query → no hits. **Include multilingual fixtures** (Latin + 中文) so `getPageText`/`searchDocument` are verified to return correct Unicode for non-English text, not just English.
- `markup-store.test.ts` — add/remove/clear; `markupForPage` filters by page; multi-rect selections stored intact.
- `flatten.test.ts` (extend) — highlight/underline/strike produce draw calls with correct rects/opacity; existing overlay flatten unaffected.
- `overlay-coords.test.ts` (extend) — `rectPctToPdfRotated` correct for 0/90/180/270° pages.
- Component — `SelectionPopup` appears on selection and dismisses on outside click; `SearchBar` shows count and cycles next/prev; **Copy** writes to a mocked clipboard.
- Playwright — select text at 100% and at a zoomed scale; assert the selected string matches the intended words (alignment).

---

## 8. Future phases (not this spec)

Redaction (privacy-first standout) · AcroForm fill & flatten · freehand ink + shapes · OCR (Tesseract.js) · sticky-note comments. Each gets its own brainstorm → spec → plan cycle.

# Shrink File Size + .exe-Style Grid Layout

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** (1) Add "Shrink file size" (the one remaining v1.6.5 feature). (2) Restructure the UI to feel like the .exe: a full-width **thumbnail grid** as the main workspace with a toolbar grouped like the .exe, and the large preview + Text/Image editor moved into a **page edit modal**. Keep ALL existing features + extras. The high-end rail+preview look is preserved on branch `design/high-end-rail`.

**Architecture:** Services stay framework-free. Shrink uses pdfjs (render) + pdf-lib (rebuild). Layout changes are UI-only (App/Toolbar/new components) and must keep every accessible name + data-testid so the 68 tests stay green.

**Tech Stack:** existing (pdf-lib, pdfjs, jszip, react-rnd, zustand).

## Global Constraints
- Node 20+; npm; Conventional Commits.
- UI never imports pdf-lib/pdfjs at runtime (services only; type-only OK).
- Keep EVERY button visible text/aria + `data-testid` (`thumb`, `selection-count`, `export-format`, `overlay-text`) unchanged so tests pass.
- Every task: `npm test` AND `npm run build` clean before commit.

---

### Task 1: shrink-service + Shrink button

**Files:** Create `src/services/shrink-service.ts`, `src/services/shrink-service.test.ts`; modify `src/App.tsx`, `src/components/Toolbar.tsx`.

**Interfaces:**
- `estimateScale(targetLongEdgePx: number, pageLongEdgePt: number): number` — pure helper: scale so the page's long edge renders to ~targetLongEdgePx (clamped to ≤2). Unit-tested.
- `shrinkPdf(bytes: Uint8Array, opts?: { quality?: number; targetLongEdgePx?: number }): Promise<Uint8Array>` — renders each page via render-service to a canvas (scale from estimateScale, default target 1600px), JPEG-encodes (quality default 0.7), and rebuilds a new PDF (via pdf-lib) with one image per page at the original page size. Returns new bytes. (Browser-only rasterization; the size win comes from re-encoding to JPEG at reduced resolution. Note: output pages become images — text is no longer selectable; this matches a common "compress/flatten" behavior.)

- [ ] **Step 1: Failing test for the pure helper**
```ts
import { describe, it, expect } from 'vitest'
import { estimateScale } from './shrink-service'
describe('estimateScale', () => {
  it('scales the long edge toward the target, clamped to 2', () => {
    expect(estimateScale(1600, 800)).toBe(2)      // wants 2.0 but clamp keeps 2
    expect(estimateScale(800, 1600)).toBe(0.5)
    expect(estimateScale(1600, 1600)).toBe(1)
  })
})
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement**
```ts
import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadRenderDoc, renderPageToCanvas } from './render-service'

export function estimateScale(targetLongEdgePx: number, pageLongEdgePt: number): number {
  return Math.min(2, targetLongEdgePx / pageLongEdgePt)
}

export async function shrinkPdf(
  bytes: Uint8Array,
  opts: { quality?: number; targetLongEdgePx?: number } = {},
): Promise<Uint8Array> {
  const { quality = 0.7, targetLongEdgePx = 1600 } = opts
  const src = await PDFDocument.load(bytes)
  const rdoc: PDFDocumentProxy = await loadRenderDoc(bytes)
  const out = await PDFDocument.create()
  const pageCount = src.getPageCount()
  for (let i = 0; i < pageCount; i++) {
    const { width: pw, height: ph } = src.getPage(i).getSize()
    const scale = estimateScale(targetLongEdgePx, Math.max(pw, ph))
    const canvas = document.createElement('canvas')
    await renderPageToCanvas(rdoc, i + 1, canvas, scale).done
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const jpg = await out.embedJpg(dataUrl)
    const page = out.addPage([pw, ph])
    page.drawImage(jpg, { x: 0, y: 0, width: pw, height: ph })
  }
  return out.save()
}
```
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Wire the button** — Toolbar: add "Shrink file size" button (`onShrink`, disabled `!hasDoc || busy`), grouped with Page#/Watermark/Info. App: `const onShrink = () => run(apply((b) => shrinkPdf(b)))`. Import shrinkPdf. (Uses the busy `run` + undoable `apply`.)
- [ ] **Step 6: Full check** — `npm test`; `npm run build` clean; browser-verify: open an image-heavy PDF, Shrink, Download, confirm the file is smaller.
- [ ] **Step 7: Commit** — `git commit -m "feat: add shrink file size (image recompression)"`

---

### Task 2: .exe-style thumbnail grid + toolbar grouping

**Files:** Modify `src/App.tsx`; create `src/components/PageGrid.tsx`; modify `src/components/Toolbar.tsx`; test `src/components/pageGrid.test.tsx`.

**Visual target (match the real v1.6.5 .exe screenshots):** LIGHT theme. Header: 🐢/logo + "PDF Page Editor" + muted "offline" badge. Toolbar = single light row, icon+text buttons GROUPED with subtle vertical dividers in this order: [New Page · Open PDF · Add / Merge] │ [Delete page · Duplicate · Rotate L · Rotate R · Extract page · Replace page · Split] │ [Page # · Watermark · Shrink file size · Info] │ (pushed right) "selected: N" · export-format `<select>` (PDF/PNG/JPG) · green **Export/Download** button. Status line under toolbar: "<fileName> loaded (N pages). Total: N". Main = light gray canvas, flex-wrap grid of WHITE rounded page cards (~156px) each = `PageCanvas` thumbnail (scale ~0.35) + "page N" label; SELECTED card = blue ring (`border-blue-500` + subtle glow). NOTE: retune palette toward this clean light look (accent can stay but the surface is light/white, not dark). Keep it professional.

**Interfaces:**
- `PageGrid` props `{ doc, pageCount, selectedPages, onCardClick(i,e), onCardOpen(i), onHoverAction(i, action), dragProps }` — flex-wrap grid of cards. Each card: `PageCanvas` thumb + "page N" label; `data-testid="thumb"`; selected → blue ring; draggable (reuse existing dnd). **Per-card HOVER toolbar** (small floating bar shown on hover, matching the .exe): buttons 👁 view (aria-label "Preview page"), T add text (aria-label "Add text"), 🖼 add picture (aria-label "Add picture"), ↻ rotate (aria-label "Rotate page"), 🗑 delete (aria-label "Delete page hover" — MUST NOT duplicate the toolbar's "Delete Page" accessible name; use a distinct label). view/add-text/add-picture call `onCardOpen(i)` (opening the edit modal, with add-text/picture triggering that tool); rotate/delete act on page i. Double-click also calls `onCardOpen(i)`.
- App: replace the left `ThumbnailRail` + always-on preview with a status line + `PageGrid` main area. Keep selection state, drag-reorder, all existing toolbar handlers/names/testids. Preview/editor moves to Task 3's modal; `onCardOpen(i)` sets `previewPage=i`. Empty state "Open a PDF to get started" unchanged. Do NOT change the top toolbar's existing button accessible names.

- [ ] **Step 1: Failing test**
```tsx
// pageGrid.test.tsx — renders one card per page with data-testid="thumb"; render-service mocked {cancel,done}
// seed store with makeSamplePdf(3); render <App/>; expect getAllByTestId('thumb') length 3; expect 'page 1' text present.
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement PageGrid + rewire App** — main area is the grid; keep `data-testid="thumb"` on each card; keep the empty-state "Open a PDF to get started" when no doc; toolbar unchanged in behavior but visually grouped like the .exe (New Page/Open/Add-Merge | Delete/Duplicate/Rotate L/R/Extract/Replace/Split | Page#/Watermark/Shrink/Info | Undo/Redo | selected:N · Export select · Download). Preserve all names/testids.
- [ ] **Step 4: Run → PASS; full `npm test` green (multi-select/ops/download/busy tests still pass against the grid).**
- [ ] **Step 5: `npm run build` clean; browser-verify grid + selection + drag-reorder.**
- [ ] **Step 6: Commit** — `git commit -m "feat: .exe-style thumbnail grid layout + grouped toolbar"`

---

### Task 3: page edit/preview modal (zoom + Text/Image editor)

**Files:** Create `src/components/PageEditModal.tsx`; modify `src/App.tsx`; test `src/components/pageEditModal.test.tsx`.

**Visual target (match Image #2 of the .exe):** DARK backdrop overlay. A top bar retains context; a CENTER control cluster has zoom (− · % · + · fit-width icon) then **Add text** and **Add picture** buttons. **X** close top-right. Big page centered via `PageCanvas` at the current zoom. Large **◀** (far left) and **▶** (far right) prev/next arrows. Bottom-center indicator **"Page [n] / M"** where `n` is a TYPEABLE number input that jumps to that page on Enter/blur (clamped 1..M). Escape or X or backdrop-click closes.

**Interfaces:**
- `PageEditModal` props `{ page, pageCount, doc, onClose, onGo(p), onAddText, onAddPicture, onApply, zoom, onZoom }` — renders the above; `PageCanvas` at zoom; `OverlayLayer` over it (sized via ResizeObserver to the modal canvas); reuse/extend `PreviewControls` for the zoom + prev/next + typeable page input (the typeable input already exists in PreviewControls — surface it here and also show "Page n / M" bottom-center). Opened when `previewPage != null`.
- App: render `{previewPage != null && doc && <PageEditModal .../>}`. The **Add text / Add picture / Apply** buttons move into the modal (keep their EXACT accessible names — "Add text", "Add picture", "Apply" — so tests pass; App still owns the handlers, now acting on `previewPage`). Escape/X/backdrop → `onClose` (setPreviewPage(null)). Keep all existing tests green (editor component tests render OverlayLayer directly and are unaffected).

- [ ] **Step 1: Failing test** — render `<PageEditModal page={0} doc={mockDoc} onClose>` (render-service mocked); assert the overlay-capable surface renders and Close fires onClose. Keep existing overlay/apply tests green (they render OverlayLayer directly, unaffected).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — modal with backdrop, PageCanvas at zoom, PreviewControls, OverlayLayer; header buttons Add Text/Add Picture/Apply/Close wired to existing App handlers; Escape/Close closes. Ensure Add Text/Picture/Apply keep exact accessible names.
- [ ] **Step 4: Run → PASS; full `npm test` green.**
- [ ] **Step 5: `npm run build` clean; browser-verify: double-click a page → modal opens → Add text/picture, move/resize, Apply bakes in, Close returns to grid.**
- [ ] **Step 6: Commit** — `git commit -m "feat: page edit/preview modal with text/image editor"`

---

---

### Task 4: Landing page (drag-and-drop empty state)

**Files:** Create `src/components/Landing.tsx`; modify `src/App.tsx`; test `src/components/landing.test.tsx`.

**Visual target:** clean, professional hero shown when NO document is loaded (replaces the bare "Open a PDF to get started" text). Centered: product name/logo, a short tagline, and a large **drop zone** ("Drag & drop a PDF here, or Choose file"). Dropping a PDF (or clicking Choose file) loads it via the SAME `onOpen(files)` path. Support drag-over highlight. Keep it minimal, lots of whitespace, one accent. Must still contain the exact text "Open a PDF to get started" somewhere (e.g. as the drop-zone helper) OR update the existing App.test empty-state assertion to the new copy (if changed, update that test).

**Interfaces:**
- `Landing` props `{ onFiles(files: File[]) }` — renders the hero + dropzone; a hidden file input (accept application/pdf, multiple) + a "Choose file" button; `onDrop` reads `e.dataTransfer.files` (filter to PDFs) and calls `onFiles`. Drag-over toggles a highlight class.
- App: when `!bytes`, render `<Landing onFiles={onOpen} />` instead of the grid/empty text.

- [ ] Failing test: render `<Landing onFiles={fn}/>`; assert a "Choose file" control + dropzone present; simulate a drop of a PDF File and assert `onFiles` called with it. (jsdom drop: fire a `drop` event with a dataTransfer stub.)
- [ ] Implement Landing + wire into App; keep `onOpen(files: File[])` compatibility. Run focused test, then FULL `npm test` + `npm run build` clean (update the empty-state assertion in App.test only if the copy changed).
- [ ] Commit: `feat: add landing page with drag-and-drop file open`

Note: CL2/CL3/CL4 should all feel CLEAN + PROFESSIONAL (references: the .exe grid + a polished page-organizer). A final polish pass (impeccable/taste) may follow.

## After this plan
Website reaches full v1.6.5 feature parity (incl. Shrink) in a familiar .exe-style grid layout, plus extras. High-end rail look preserved on `design/high-end-rail`. Optional follow-ups: use impeccable to refine the grid styling; native-LibreOffice Office→PDF convert; lock/unlock (qpdf-wasm); wrap in Tauri for the desktop .exe.

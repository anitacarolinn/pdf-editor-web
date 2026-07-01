# Parity Phase A — Richer Page Ops + Preview Navigation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring the website closer to PDF Page Editor v1.6.5: expose the already-built split/extract/reorder, add Rotate L/R, Duplicate, Replace, multi-page selection, and a real preview mode (zoom/fit, typeable page-jump box, ◀▶ prev/next).

**Architecture:** Same as foundation — pure `src/services/*` engine (pdf-lib/pdfjs), UI (React) only calls services. New pure page-ops are async `Uint8Array`→`Uint8Array`. Split-to-zip uses `jszip` in a new export helper. Multi-select lives in App state as a `Set<number>` of 0-based page indices.

**Tech Stack:** existing + `jszip` (for Split → multiple files as one download).

## Global Constraints
- Node 20+; npm; Conventional Commits.
- UI (src/App.tsx, src/components/*) must NEVER import pdf-lib/pdfjs-dist at runtime (type-only OK) — go through services.
- Page operations return NEW bytes, never mutate input; all async; page indices are 0-based.
- Every task runs `npm test` AND `npm run build` before commit; both must be clean.
- Selection is a `Set<number>` of 0-based page indices in App; the currently-previewed page is a separate 1-based `selected` number.

---

### Task 1: page-ops — duplicatePages

**Files:** Modify `src/services/page-ops.ts`; Test `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `duplicatePages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array>` — inserts a copy of each given page immediately AFTER the original. Processing highest-index-first keeps earlier indices valid. Result order for duplicating [1] of pages [A,B,C] is [A,B,B,C].

- [ ] **Step 1: Write the failing test**
```ts
import { duplicatePages } from './page-ops'

describe('duplicatePages', () => {
  it('inserts a copy of each page after the original', async () => {
    const bytes = await makeSamplePdf(3) // widths 100,200,300
    const out = await duplicatePages(bytes, [1])
    expect(await getPageWidths(out)).toEqual([100, 200, 200, 300])
  })

  it('duplicates multiple selected pages correctly', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await duplicatePages(bytes, [0, 2])
    expect(await getPageWidths(out)).toEqual([100, 100, 200, 300, 300])
  })
})
```

- [ ] **Step 2: Run to verify fail** — `npm test -- page-ops` → FAIL (duplicatePages not exported).

- [ ] **Step 3: Implement**
```ts
export async function duplicatePages(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  // highest-first so earlier insertions don't shift not-yet-processed indices
  const sorted = [...new Set(indices)].sort((a, b) => b - a)
  for (const i of sorted) {
    const [copy] = await doc.copyPages(doc, [i])
    doc.insertPage(i + 1, copy)
  }
  return doc.save()
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- page-ops` → PASS.
- [ ] **Step 5: Full check** — `npm test` all pass; `npm run build` clean.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add duplicatePages page operation"`

---

### Task 2: page-ops — rotatePages (multi-page, both directions)

**Files:** Modify `src/services/page-ops.ts`; Test `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `rotatePages(bytes: Uint8Array, indices: number[], degrees: number): Promise<Uint8Array>` — adds `degrees` (normalized to a multiple of 90 in [0,360)) to each listed page's existing rotation. `degrees` may be negative (Rotate L = -90, Rotate R = 90).

- [ ] **Step 1: Write the failing test**
```ts
import { rotatePages } from './page-ops'
import { PDFDocument as PDFDoc2 } from 'pdf-lib'

describe('rotatePages', () => {
  it('rotates all listed pages, leaves others', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await rotatePages(bytes, [0, 2], 90)
    const doc = await PDFDoc2.load(out)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
    expect(doc.getPage(1).getRotation().angle).toBe(0)
    expect(doc.getPage(2).getRotation().angle).toBe(90)
  })

  it('normalizes negative degrees (rotate left)', async () => {
    const bytes = await makeSamplePdf(1)
    const out = await rotatePages(bytes, [0], -90)
    const doc = await PDFDoc2.load(out)
    expect(doc.getPage(0).getRotation().angle).toBe(270)
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL (rotatePages not exported).

- [ ] **Step 3: Implement** (reuse the existing `pdfDegrees` import already in the file)
```ts
export async function rotatePages(
  bytes: Uint8Array,
  indices: number[],
  degrees: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  for (const i of new Set(indices)) {
    const page = doc.getPage(i)
    const next = (((page.getRotation().angle + degrees) % 360) + 360) % 360
    page.setRotation(pdfDegrees(next))
  }
  return doc.save()
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add rotatePages (multi-page, both directions)"`

---

### Task 3: page-ops — replacePage

**Files:** Modify `src/services/page-ops.ts`; Test `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `replacePage(bytes: Uint8Array, index: number, otherBytes: Uint8Array, otherIndex = 0): Promise<Uint8Array>` — replaces the page at `index` with page `otherIndex` from `otherBytes`, preserving position and total count.

- [ ] **Step 1: Write the failing test**
```ts
import { replacePage } from './page-ops'

describe('replacePage', () => {
  it('replaces the page at index with a page from another pdf', async () => {
    const base = await makeSamplePdf(3)      // 100,200,300
    const other = await makeSamplePdf(5)     // 100,200,300,400,500
    const out = await replacePage(base, 1, other, 3) // put other's page3 (width 400) at index 1
    expect(await getPageWidths(out)).toEqual([100, 400, 300])
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement**
```ts
export async function replacePage(
  bytes: Uint8Array,
  index: number,
  otherBytes: Uint8Array,
  otherIndex = 0,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const src = await PDFDocument.load(otherBytes)
  const [copy] = await doc.copyPages(src, [otherIndex])
  doc.insertPage(index, copy)     // now the replacement sits BEFORE the old page
  doc.removePage(index + 1)       // remove the old page (shifted by +1)
  return doc.save()
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add replacePage page operation"`

---

### Task 4: Split-to-zip export helper

**Files:** Create `src/services/zip-export.ts`; Test `src/services/zip-export.test.ts`; install `jszip`.

**Interfaces:**
- Produces: `buildZip(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array>` — returns zip bytes; and `downloadZip(files, zipName): Promise<void>` — builds the zip and triggers a download (reusing the Blob/anchor pattern from export-service).

- [ ] **Step 1: Install jszip** — `npm install jszip`
- [ ] **Step 2: Write the failing test**
```ts
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildZip } from './zip-export'

describe('buildZip', () => {
  it('packs files into a readable zip', async () => {
    const zipped = await buildZip([
      { name: 'a.pdf', bytes: new Uint8Array([1, 2, 3]) },
      { name: 'b.pdf', bytes: new Uint8Array([4, 5]) },
    ])
    const round = await JSZip.loadAsync(zipped)
    expect(Object.keys(round.files).sort()).toEqual(['a.pdf', 'b.pdf'])
    expect(await round.file('a.pdf')!.async('uint8array')).toEqual(new Uint8Array([1, 2, 3]))
  })
})
```
- [ ] **Step 3: Run to verify fail** — FAIL (module not found).
- [ ] **Step 4: Implement**
```ts
import JSZip from 'jszip'

export async function buildZip(
  files: { name: string; bytes: Uint8Array }[],
): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.bytes)
  return zip.generateAsync({ type: 'uint8array' })
}

export async function downloadZip(
  files: { name: string; bytes: Uint8Array }[],
  zipName: string,
): Promise<void> {
  const bytes = await buildZip(files)
  const blob = new Blob([bytes.slice().buffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
```
- [ ] **Step 5: Run to verify pass** — PASS.
- [ ] **Step 6: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 7: Commit** — `git commit -m "feat: add zip export helper for split"`

---

### Task 5: Multi-select thumbnails

**Files:** Modify `src/App.tsx`, `src/components/ThumbnailRail.tsx` (if needed for layout); Test `src/components/multiSelect.test.tsx`

**Interfaces:**
- Consumes: existing store + PageCanvas.
- Produces: App holds `selectedPages: Set<number>` (0-based). Clicking a thumbnail selects just that page AND sets it as the previewed page. Ctrl/Cmd-click toggles a page in the set; Shift-click selects a contiguous range from the last-clicked. A "selected: N" count shows in the toolbar area. When no explicit multi-select, the set contains the single previewed page.

- [ ] **Step 1: Write the failing interaction test**
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 3 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(3)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

describe('multi-select', () => {
  it('ctrl-click adds pages to the selection count', async () => {
    render(<App />)
    const thumbs = await screen.findAllByTestId('thumb')
    await userEvent.click(thumbs[0])
    await userEvent.keyboard('{Control>}')
    await userEvent.click(thumbs[2])
    await userEvent.keyboard('{/Control}')
    expect(screen.getByTestId('selection-count').textContent).toContain('2')
  })
})
```
- [ ] **Step 2: Run to verify fail** — FAIL (no testids/selection).
- [ ] **Step 3: Implement** — In `App.tsx`:
  - Add `const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([0]))` and `const [anchor, setAnchor] = useState(0)`.
  - Thumbnail `onClick={(e) => handleThumbClick(i, e)}` where:
```tsx
  function handleThumbClick(i: number, e: React.MouseEvent) {
    setSelected(i + 1)
    if (e.shiftKey) {
      const [lo, hi] = [Math.min(anchor, i), Math.max(anchor, i)]
      setSelectedPages(new Set(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)))
    } else if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedPages)
      next.has(i) ? next.delete(i) : next.add(i)
      setSelectedPages(next)
      setAnchor(i)
    } else {
      setSelectedPages(new Set([i]))
      setAnchor(i)
    }
  }
```
  - Pass `data-testid="thumb"` to each thumbnail wrapper and highlight border when `selectedPages.has(i)`.
  - Reset selection to `new Set([0])` in `onOpen` and clamp on page-count changes.
  - Add a toolbar-area element `<span data-testid="selection-count">selected: {selectedPages.size}</span>`.
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: multi-select pages in thumbnail rail"`

---

### Task 6: Wire operations to selection (Rotate L/R, Duplicate, Extract, Replace, Split, Delete)

**Files:** Modify `src/components/Toolbar.tsx`, `src/App.tsx`; Test `src/components/opsWiring.test.tsx`

**Interfaces:**
- Consumes: page-ops (`rotatePages`, `duplicatePages`, `deletePages`, `extractPages`, `replacePage`, `splitPdf`), `downloadBytes`, `downloadZip`, store `apply`.
- Produces: Toolbar buttons **Rotate L**, **Rotate R**, **Duplicate**, **Delete**, **Extract** (selected → downloaded PDF), **Split** (each selected page → its own PDF, downloaded as a zip), **Replace** (replace the previewed page with page 0 of a chosen file). Handlers operate on `Array.from(selectedPages)` (fallback to `[selected-1]`).

- [ ] **Step 1: Write the failing test** (verifies Rotate R on the current selection changes page rotation via a real op; render-service mocked)
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'
import { PDFDocument } from 'pdf-lib'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 2 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(2)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

it('Rotate R rotates the selected page', async () => {
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Rotate R' }))
  await waitFor(async () => {
    const doc = await PDFDocument.load(useDocumentStore.getState().bytes!)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
  })
})
```
- [ ] **Step 2: Run to verify fail** — FAIL (no Rotate R button).
- [ ] **Step 3: Implement** — Replace the single `Rotate` button in Toolbar with `Rotate L`/`Rotate R`, add `Duplicate`, `Extract`, `Split`, `Replace` buttons and matching props. In `App.tsx` add handlers:
```tsx
  const sel = () => (selectedPages.size ? [...selectedPages].sort((a, b) => a - b) : [selected - 1])
  const onRotateL = () => runOp(apply((b) => rotatePages(b, sel(), -90)))
  const onRotateR = () => runOp(apply((b) => rotatePages(b, sel(), 90)))
  const onDuplicate = () => runOp(apply((b) => duplicatePages(b, sel())))
  const onDelete = () => runOp(apply((b) => deletePages(b, sel())))
  const onExtract = async () => {
    if (!bytes) return
    const out = await extractPages(bytes, sel())
    downloadBytes(out, 'extracted.pdf')
  }
  const onSplit = async () => {
    if (!bytes) return
    const pages = sel()
    const parts = await splitPdf(bytes, pages.map((p) => [p]))
    await downloadZip(parts.map((bytes, k) => ({ name: `page-${pages[k] + 1}.pdf`, bytes })), 'split.pdf.zip')
  }
  const onReplace = (file: File) => runOp(
    (async () => {
      const other = await readFileAsBytes(file)
      await apply((b) => replacePage(b, selected - 1, other, 0))
    })(),
  )
```
  Import `rotatePages, duplicatePages, extractPages, replacePage, splitPdf` from page-ops; `downloadZip` from zip-export. Keep the old single-rotate removed. Add a hidden file input for Replace (like Merge). Wire Toolbar props.
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: wire rotate L/R, duplicate, extract, split, replace to selection"`

---

### Task 7: Drag-to-reorder thumbnails

**Files:** Modify `src/App.tsx` (thumbnail wrappers), maybe `src/components/ThumbnailRail.tsx`; Test `src/components/reorder.test.tsx`

**Interfaces:**
- Consumes: `reorderPages` (page-ops), store `apply`.
- Produces: HTML5 drag-and-drop on thumbnails; dropping page at position `from` onto position `to` calls `apply(b => reorderPages(b, newOrder))` where `newOrder` moves index `from` to `to`.

- [ ] **Step 1: Write the failing test** (simulate drag via the drop handler through a testable helper `moveIndex`)
```ts
import { describe, it, expect } from 'vitest'
import { moveIndex } from '../services/order-util'

describe('moveIndex', () => {
  it('moves an index to a new position', () => {
    expect(moveIndex(3, 0, 2)).toEqual([1, 2, 0]) // move 0 -> 2 in [0,1,2]
    expect(moveIndex(3, 2, 0)).toEqual([2, 0, 1])
  })
})
```
- [ ] **Step 2: Run to verify fail** — FAIL (order-util missing).
- [ ] **Step 3: Implement helper** `src/services/order-util.ts`:
```ts
// Return a permutation of [0..n-1] with `from` moved to `to`.
export function moveIndex(n: number, from: number, to: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  const [x] = arr.splice(from, 1)
  arr.splice(to, 0, x)
  return arr
}
```
- [ ] **Step 4: Wire drag/drop in App thumbnails** — add `draggable`, `onDragStart={() => (dragFrom.current = i)}`, `onDragOver={(e) => e.preventDefault()}`, `onDrop={() => { if (dragFrom.current !== null && dragFrom.current !== i) runOp(apply((b) => reorderPages(b, moveIndex(pageCount, dragFrom.current!, i)))); dragFrom.current = null }}` where `const dragFrom = useRef<number | null>(null)`. Import `reorderPages` and `moveIndex`.
- [ ] **Step 5: Run to verify pass** — `npm test -- order-util` PASS; `npm test` all pass.
- [ ] **Step 6: Full check** — `npm run build` clean; manually verify drag reorders in the browser.
- [ ] **Step 7: Commit** — `git commit -m "feat: drag-to-reorder thumbnails"`

---

### Task 8: Preview navigation (prev/next, page-jump box, zoom/fit)

**Files:** Create `src/components/PreviewControls.tsx`; Modify `src/App.tsx`; Test `src/components/previewControls.test.tsx`

**Interfaces:**
- Consumes: nothing new; pure UI over App's `selected`, `pageCount`, and a new `zoom` state.
- Produces: a control bar above the viewer with: `◀` prev (disabled on page 1), a number `<input>` bound to the current page (typing a valid page jumps to it), `/ N` total, `▶` next (disabled on last), and zoom `−` / `%` / `+` / `Fit` controls that set App `zoom` (a scale multiplier applied to the viewer PageCanvas).

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewControls from './PreviewControls'

it('prev is disabled on first page; next advances', async () => {
  const onGo = vi.fn()
  render(<PreviewControls page={1} pageCount={3} zoom={1} onGo={onGo} onZoom={() => {}} />)
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(onGo).toHaveBeenCalledWith(2)
})

it('typing a page number jumps to it', async () => {
  const onGo = vi.fn()
  render(<PreviewControls page={1} pageCount={5} zoom={1} onGo={onGo} onZoom={() => {}} />)
  const box = screen.getByRole('spinbutton', { name: 'Current page' })
  await userEvent.clear(box)
  await userEvent.type(box, '4{Enter}')
  expect(onGo).toHaveBeenCalledWith(4)
})
```
- [ ] **Step 2: Run to verify fail** — FAIL (component missing).
- [ ] **Step 3: Implement `PreviewControls.tsx`**
```tsx
export default function PreviewControls({
  page, pageCount, zoom, onGo, onZoom,
}: {
  page: number
  pageCount: number
  zoom: number
  onGo: (p: number) => void
  onZoom: (z: number | 'fit') => void
}) {
  const clamp = (p: number) => Math.min(Math.max(1, p), pageCount)
  return (
    <div className="flex items-center gap-2 border-b bg-white px-3 py-1 text-sm">
      <button aria-label="Previous page" className="px-2 disabled:opacity-40"
        disabled={page <= 1} onClick={() => onGo(clamp(page - 1))}>◀</button>
      <input aria-label="Current page" type="number" min={1} max={pageCount}
        className="w-14 rounded border px-1 text-center" defaultValue={page} key={page}
        onKeyDown={(e) => { if (e.key === 'Enter') onGo(clamp(Number((e.target as HTMLInputElement).value))) }}
        onBlur={(e) => onGo(clamp(Number(e.target.value)))} />
      <span className="text-slate-500">/ {pageCount}</span>
      <button aria-label="Next page" className="px-2 disabled:opacity-40"
        disabled={page >= pageCount} onClick={() => onGo(clamp(page + 1))}>▶</button>
      <span className="mx-2 w-px self-stretch bg-slate-200" />
      <button aria-label="Zoom out" className="px-2" onClick={() => onZoom(Math.max(0.25, zoom - 0.25))}>−</button>
      <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" className="px-2" onClick={() => onZoom(zoom + 0.25)}>+</button>
      <button aria-label="Fit width" className="px-2" onClick={() => onZoom('fit')}>Fit</button>
    </div>
  )
}
```
- [ ] **Step 4: Wire into App** — add `const [zoom, setZoom] = useState(1.5)`; render `<PreviewControls>` above the viewer PageCanvas when `doc`; `onGo={(p) => setSelected(p)}`; `onZoom={(z) => setZoom(z === 'fit' ? 1.5 : z)}` (treat Fit as a sensible default for now — true fit-to-width can compute from container later); pass `scale={zoom}` to the viewer PageCanvas instead of the hardcoded 1.5.
- [ ] **Step 5: Run to verify pass** — `npm test -- previewControls` PASS; `npm test` all pass.
- [ ] **Step 6: Full check** — `npm run build` clean; manually verify prev/next, typing a page number jumps, zoom changes size.
- [ ] **Step 7: Commit** — `git commit -m "feat: preview navigation (prev/next, page-jump, zoom)"`

---

## After Phase A
Phase B plan (Page #, Watermark, Info, Export-as-image, and folding Replace into a nicer modal) follows, then Phase C (Shrink file size), then the pro-feature plans (e-sign, lock/unlock, annotate, convert).

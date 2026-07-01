# Parity Phase B — Page Numbers, Watermark, Info, Export-as-Image

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the remaining `.exe`-parity document features: document Info (metadata), Page # (page numbers), Watermark, and Export-as-image (PNG/JPG) via an export-format dropdown. Also add a `busy` guard so toolbar ops are disabled during in-flight operations.

**Architecture:** Same — pure `src/services/*` engine, UI calls services only. New engine ops are async `Uint8Array`→`Uint8Array` (page-numbers, watermark) using pdf-lib's `drawText`; a metadata reader returns a plain object; image export renders pages via the existing render-service canvas path and packs them with the existing `zip-export`.

**Tech Stack:** existing (pdf-lib, pdfjs, jszip). No new deps.

## Global Constraints
- Node 20+; npm; Conventional Commits.
- UI (src/App.tsx, src/components/*) must NEVER import pdf-lib/pdfjs-dist at runtime (type-only OK).
- Page operations return NEW bytes, never mutate input; all async; page indices 0-based.
- Every task runs `npm test` AND `npm run build` before commit; both clean.
- Drawing ops (page numbers, watermark) and image rasterization cannot fully assert visual output in jsdom — tests assert structural invariants (page count preserved, output is a loadable PDF, bytes changed) and pure helpers; visual correctness is browser-verified.

---

### Task 1: metadata — readInfo

**Files:** Create `src/services/metadata.ts`; Test `src/services/metadata.test.ts`

**Interfaces:**
- Produces: `readInfo(bytes: Uint8Array): Promise<{ pageCount: number; title: string; author: string; subject: string; creator: string; producer: string; pageSizes: { width: number; height: number }[] }>` — reads document metadata + per-page sizes (rounded). Missing string fields return ''.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { readInfo } from './metadata'

async function pdfWithTitle(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('My Doc')
  doc.setAuthor('Alice')
  doc.addPage([100, 200])
  doc.addPage([300, 400])
  return doc.save()
}

describe('readInfo', () => {
  it('reads metadata and page sizes', async () => {
    const info = await readInfo(await pdfWithTitle())
    expect(info.pageCount).toBe(2)
    expect(info.title).toBe('My Doc')
    expect(info.author).toBe('Alice')
    expect(info.pageSizes).toEqual([
      { width: 100, height: 200 },
      { width: 300, height: 400 },
    ])
  })

  it('returns empty strings for missing fields', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([100, 100])
    const info = await readInfo(await doc.save())
    expect(info.title).toBe('')
    expect(info.author).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify fail** — `npm test -- metadata` → FAIL.

- [ ] **Step 3: Implement**
```ts
import { PDFDocument } from 'pdf-lib'

export interface PdfInfo {
  pageCount: number
  title: string
  author: string
  subject: string
  creator: string
  producer: string
  pageSizes: { width: number; height: number }[]
}

export async function readInfo(bytes: Uint8Array): Promise<PdfInfo> {
  const doc = await PDFDocument.load(bytes)
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    pageSizes: doc.getPages().map((p) => ({
      width: Math.round(p.getWidth()),
      height: Math.round(p.getHeight()),
    })),
  }
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add pdf metadata readInfo service"`

---

### Task 2: page-ops — addPageNumbers

**Files:** Modify `src/services/page-ops.ts`; Test `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `addPageNumbers(bytes: Uint8Array, opts?: { startAt?: number; format?: 'n' | 'n/total'; fontSize?: number }): Promise<Uint8Array>` — draws a page number centered near the bottom of every page. Default startAt 1, format 'n', fontSize 10. Preserves page count; input not mutated.

- [ ] **Step 1: Write the failing test**
```ts
import { addPageNumbers } from './page-ops'

describe('addPageNumbers', () => {
  it('returns a valid pdf with the same page count and changed bytes', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await addPageNumbers(bytes, { format: 'n/total' })
    expect(await getPageCount(out)).toBe(3)
    expect(out.length).not.toBe(bytes.length) // content was added
  })

  it('does not mutate the input', async () => {
    const bytes = await makeSamplePdf(2)
    const copy = bytes.slice()
    await addPageNumbers(bytes)
    expect(bytes).toEqual(copy)
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement** (uses pdf-lib `StandardFonts`/`rgb` — add to the existing pdf-lib import)
```ts
import { PDFDocument, degrees as pdfDegrees, StandardFonts, rgb } from 'pdf-lib'

export async function addPageNumbers(
  bytes: Uint8Array,
  opts: { startAt?: number; format?: 'n' | 'n/total'; fontSize?: number } = {},
): Promise<Uint8Array> {
  const { startAt = 1, format = 'n', fontSize = 10 } = opts
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  pages.forEach((page, i) => {
    const label = format === 'n/total' ? `${startAt + i} / ${pages.length}` : `${startAt + i}`
    const width = font.widthOfTextAtSize(label, fontSize)
    const { width: pw } = page.getSize()
    page.drawText(label, {
      x: pw / 2 - width / 2,
      y: 24,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  })
  return doc.save()
}
```
(Update the top `import { PDFDocument, degrees as pdfDegrees } from 'pdf-lib'` line to also import `StandardFonts, rgb`.)

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add addPageNumbers page operation"`

---

### Task 3: page-ops — addWatermark

**Files:** Modify `src/services/page-ops.ts`; Test `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `addWatermark(bytes: Uint8Array, text: string, opts?: { fontSize?: number; opacity?: number }): Promise<Uint8Array>` — draws `text` diagonally (45°) centered on every page, semi-transparent. Default fontSize 48, opacity 0.25. Preserves page count; input not mutated.

- [ ] **Step 1: Write the failing test**
```ts
import { addWatermark } from './page-ops'

describe('addWatermark', () => {
  it('stamps text on every page, preserving count', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await addWatermark(bytes, 'DRAFT')
    expect(await getPageCount(out)).toBe(2)
    expect(out.length).not.toBe(bytes.length)
  })

  it('does not mutate the input', async () => {
    const bytes = await makeSamplePdf(1)
    const copy = bytes.slice()
    await addWatermark(bytes, 'X')
    expect(bytes).toEqual(copy)
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement**
```ts
export async function addWatermark(
  bytes: Uint8Array,
  text: string,
  opts: { fontSize?: number; opacity?: number } = {},
): Promise<Uint8Array> {
  const { fontSize = 48, opacity = 0.25 } = opts
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: pdfDegrees(45),
    })
  }
  return doc.save()
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add addWatermark page operation"`

---

### Task 4: image-export service (PNG/JPG)

**Files:** Create `src/services/image-export.ts`; Test `src/services/image-export.test.ts`

**Interfaces:**
- Produces:
  - `imageName(pageNumber: number, type: 'png' | 'jpeg'): string` — pure helper returning `page-<n>.png` / `page-<n>.jpg` (jpeg→jpg extension).
  - `canvasToBytes(canvas: HTMLCanvasElement, type: 'png' | 'jpeg'): Promise<Uint8Array>` — canvas → image bytes (via toBlob).
  - `exportPagesAsImages(doc: PDFDocumentProxy, pages: number[], type: 'png' | 'jpeg', scale: number): Promise<{ name: string; bytes: Uint8Array }[]>` — renders each 1-based page to an offscreen canvas and returns image files (for zipping). `pages` are 1-based page numbers.

**Note:** Only the pure `imageName` helper is unit-tested (canvas rasterization needs a real browser). The rest is browser-verified in Task 8.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest'
import { imageName } from './image-export'

describe('imageName', () => {
  it('maps type to extension, jpeg -> jpg', () => {
    expect(imageName(1, 'png')).toBe('page-1.png')
    expect(imageName(5, 'jpeg')).toBe('page-5.jpg')
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement**
```ts
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageToCanvas } from './render-service'

export function imageName(pageNumber: number, type: 'png' | 'jpeg'): string {
  return `page-${pageNumber}.${type === 'jpeg' ? 'jpg' : 'png'}`
}

export async function canvasToBytes(
  canvas: HTMLCanvasElement,
  type: 'png' | 'jpeg',
): Promise<Uint8Array> {
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      type === 'jpeg' ? 'image/jpeg' : 'image/png',
    ),
  )
  return new Uint8Array(await blob.arrayBuffer())
}

export async function exportPagesAsImages(
  doc: PDFDocumentProxy,
  pages: number[],
  type: 'png' | 'jpeg',
  scale: number,
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const out: { name: string; bytes: Uint8Array }[] = []
  for (const p of pages) {
    const canvas = document.createElement('canvas')
    await renderPageToCanvas(doc, p, canvas, scale).done
    out.push({ name: imageName(p, type), bytes: await canvasToBytes(canvas, type) })
  }
  return out
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add image-export service (png/jpg)"`

---

### Task 5: Info modal UI

**Files:** Create `src/components/InfoModal.tsx`; Modify `src/App.tsx`, `src/components/Toolbar.tsx`; Test `src/components/infoModal.test.tsx`

**Interfaces:**
- Consumes: `readInfo` (metadata).
- Produces: an **Info** toolbar button (disabled when no doc); clicking opens a modal showing pageCount, title, author, subject, creator, producer, and the size of the current page. Modal has a Close button.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InfoModal from './InfoModal'

it('shows metadata fields', () => {
  render(
    <InfoModal
      info={{ pageCount: 3, title: 'T', author: 'A', subject: '', creator: '', producer: 'P', pageSizes: [{ width: 100, height: 200 }] }}
      onClose={() => {}}
    />,
  )
  expect(screen.getByText('T')).toBeInTheDocument()
  expect(screen.getByText(/Pages/)).toBeInTheDocument()
  expect(screen.getByText('3')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement `InfoModal.tsx`** (a simple overlay). Then in App: add `const [info, setInfo] = useState<PdfInfo | null>(null)`, an `onInfo` handler `async () => { if (bytes) setInfo(await readInfo(bytes)) }`, render `{info && <InfoModal info={info} onClose={() => setInfo(null)} />}`. Add an `onInfo` prop + Info button to Toolbar (disabled when `!hasDoc`).
```tsx
import type { PdfInfo } from '../services/metadata'

export default function InfoModal({ info, onClose }: { info: PdfInfo; onClose: () => void }) {
  const rows: [string, string | number][] = [
    ['Pages', info.pageCount],
    ['Title', info.title || '—'],
    ['Author', info.author || '—'],
    ['Subject', info.subject || '—'],
    ['Creator', info.creator || '—'],
    ['Producer', info.producer || '—'],
  ]
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div className="w-80 rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">Document Info</h2>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="py-1 pr-4 text-slate-500">{k}</td>
                <td className="py-1">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-4 rounded bg-slate-800 px-3 py-1 text-sm text-white" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add document Info modal"`

---

### Task 6: Page # button

**Files:** Modify `src/App.tsx`, `src/components/Toolbar.tsx`; Test extend `src/components/opsWiring.test.tsx` (or a new small test)

**Interfaces:**
- Consumes: `addPageNumbers`.
- Produces: a **Page #** toolbar button (disabled when no doc) that applies `addPageNumbers(b, { format: 'n/total' })` via the store's `apply`.

- [ ] **Step 1: Write the failing test**
```tsx
it('Page # adds numbers without changing page count', async () => {
  render(<App />)
  const before = useDocumentStore.getState().bytes!
  const beforeCount = await getPageCount(before)
  await userEvent.click(await screen.findByRole('button', { name: 'Page #' }))
  await waitFor(async () => {
    const after = useDocumentStore.getState().bytes!
    expect(after).not.toBe(before)
    expect(await getPageCount(after)).toBe(beforeCount)
  })
})
```
(Reuse the file's existing render-service mock and a loaded sample doc in beforeEach.)

- [ ] **Step 2: Run to verify fail** — FAIL (no Page # button).
- [ ] **Step 3: Implement** — Toolbar: add `onPageNumbers` prop + "Page #" button (disabled `!hasDoc`). App: `const onPageNumbers = () => runOp(apply((b) => addPageNumbers(b, { format: 'n/total' })))`; import addPageNumbers; pass prop.
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: wire Page # (page numbers) button"`

---

### Task 7: Watermark button

**Files:** Modify `src/App.tsx`, `src/components/Toolbar.tsx`; Test extend the wiring test

**Interfaces:**
- Consumes: `addWatermark`.
- Produces: a **Watermark** toolbar button that prompts for text (`window.prompt`, default "DRAFT") and applies `addWatermark(b, text)` via `apply`. If the user cancels the prompt (null), do nothing.

- [ ] **Step 1: Write the failing test**
```tsx
it('Watermark stamps text (page count preserved)', async () => {
  vi.spyOn(window, 'prompt').mockReturnValue('DRAFT')
  render(<App />)
  const before = useDocumentStore.getState().bytes!
  const beforeCount = await getPageCount(before)
  await userEvent.click(await screen.findByRole('button', { name: 'Watermark' }))
  await waitFor(async () => {
    const after = useDocumentStore.getState().bytes!
    expect(after).not.toBe(before)
    expect(await getPageCount(after)).toBe(beforeCount)
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.
- [ ] **Step 3: Implement** — Toolbar: `onWatermark` prop + button. App: `const onWatermark = () => { const t = window.prompt('Watermark text', 'DRAFT'); if (t) runOp(apply((b) => addWatermark(b, t))) }`; import addWatermark.
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: wire Watermark button"`

---

### Task 8: Export format dropdown (PDF / PNG / JPG)

**Files:** Modify `src/components/Toolbar.tsx`, `src/App.tsx`; Test `src/components/exportFormat.test.tsx`

**Interfaces:**
- Consumes: `downloadBytes`, `exportPagesAsImages` + `downloadZip`.
- Produces: a `<select>` in the toolbar with options PDF / PNG / JPG (`data-testid="export-format"`), next to the Download button. Download behavior depends on the format:
  - **PDF:** current behavior (`downloadBytes(bytes, fileName)`).
  - **PNG / JPG:** render selected pages (`sel()`, 1-based via `+1`) to images and `downloadZip` them as `images.zip`. If a single page, download the single image via `downloadBytes`-style image download.

- [ ] **Step 1: Write the failing test** (PDF path still works; format select present)
```tsx
it('exposes an export format selector defaulting to PDF; PDF download works', async () => {
  const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
  globalThis.URL.revokeObjectURL = vi.fn()
  render(<App />)
  const sel = screen.getByTestId('export-format') as HTMLSelectElement
  expect(sel.value).toBe('pdf')
  await userEvent.click(screen.getByRole('button', { name: 'Download' }))
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()
})
```
- [ ] **Step 2: Run to verify fail** — FAIL (no selector).
- [ ] **Step 3: Implement** — Toolbar: add a controlled `<select data-testid="export-format" value={p.exportFormat} onChange={e => p.onExportFormatChange(e.target.value)}>` with pdf/png/jpeg options. App: `const [exportFormat, setExportFormat] = useState<'pdf'|'png'|'jpeg'>('pdf')`; rework `onDownload`:
```tsx
const onDownload = async () => {
  if (!bytes) return
  if (exportFormat === 'pdf') { downloadBytes(bytes, fileName ?? 'edited.pdf'); return }
  if (!doc) return
  const pages = sel().map((i) => i + 1) // 1-based for pdf.js
  const files = await exportPagesAsImages(doc, pages, exportFormat, 2)
  await downloadZip(files, 'images.zip')
}
```
  Import `exportPagesAsImages` from services/image-export. Pass `exportFormat` + `onExportFormatChange` to Toolbar.
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean; manually verify PNG/JPG export in the browser (downloads a zip of images).
- [ ] **Step 6: Commit** — `git commit -m "feat: export format dropdown (pdf/png/jpg)"`

---

### Task 9: busy guard (disable ops during in-flight operations)

**Files:** Modify `src/App.tsx`, `src/components/Toolbar.tsx`; Test `src/components/busy.test.tsx`

**Interfaces:**
- Produces: a `busy` boolean in App set true while any mutating/downloading async op runs, false when it settles; passed to Toolbar to disable operation buttons (Open stays enabled). Prevents overlapping ops / stale-bytes races.

- [ ] **Step 1: Write the failing test** (buttons disabled while a slow op runs)
```tsx
it('disables ops while an operation is in flight', async () => {
  // apply is backed by the store; simulate slowness by spying page-ops
  render(<App />)
  const rotate = await screen.findByRole('button', { name: 'Rotate R' })
  await userEvent.click(rotate)
  // immediately after click, before microtasks flush, the button should be disabled
  expect(rotate).toBeDisabled()
  await waitFor(() => expect(rotate).not.toBeDisabled())
})
```
(If timing proves flaky, assert via a `busy`-driven `aria-busy` on the toolbar instead; keep the test deterministic.)
- [ ] **Step 2: Run to verify fail** — FAIL.
- [ ] **Step 3: Implement** — Add `const [busy, setBusy] = useState(false)`. Wrap the async op runner: `const run = async (p: Promise<void>) => { setBusy(true); try { await p } catch (e) { console.error('operation failed', e) } finally { setBusy(false) } }` and use it for rotate/delete/duplicate/insert/merge/pageNumbers/watermark/replace and the async downloads. Pass `busy` to Toolbar; disable op buttons with `disabled={!hasDoc || busy}` (Undo/Redo also gated by busy). Keep Open enabled.
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: disable toolbar ops during in-flight operations"`

---

## After Phase B
Phase C (Shrink file size) follows, then the pro features (e-sign, lock/unlock, annotate, Office convert). A UI polish pass using the installed design-taste skills can happen any time the user wants.

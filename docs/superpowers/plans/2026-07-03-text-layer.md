# Text Layer (Select · Copy · Markup · Search · Extract) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selectable text layer to the PDF preview and the features it unlocks — text selection with a floating popup (Copy / Highlight / Underline / Strikethrough / Search this text), persistent markup that exports into the PDF, Ctrl+F find, and text extraction — all 100% client-side.

**Architecture:** New framework-free services (`text-service`, `markup-store`, plus helpers in `overlay-coords`/`file-io`) wrap `pdf.js` and hold state, mirroring the existing `render-service`/`overlay-store` split. New React components (`MarkupLayer`, `SelectionPopup`, `SearchBar`) mount inside the existing `PageEditModal` preview, layered over the canvas. Markup is separate editable state flattened into the PDF only at Download/Export — exactly how overlay objects already work (undo/redo is bytes-only and untouched).

**Tech Stack:** React 19 · TypeScript · Vite · Zustand · `pdfjs-dist` 6 (`TextLayer`, `getTextContent`) · `pdf-lib` (draw markup) · Vitest + Testing Library (unit/component) · Playwright (real-browser alignment).

## Global Constraints

- **CSR only.** No network, no server, no uploads. Everything runs in the browser.
- **Golden rule:** UI components never import `pdf-lib`/`pdfjs-dist` directly — they call services under `src/services/`.
- **Page indices in stores are 0-based** (matches `overlay-store`). `pdf.js` page numbers are 1-based (`page + 1`).
- **Coordinates are page-relative percentages** (`xPct/yPct/wPct/hPct`, top-left origin, y-down in the visual frame) — identical to `OverlayObject`.
- **i18n:** every user-facing string goes in `src/services/i18n.tsx` for both `en` and `zh`, and in the `Dict` interface. No hardcoded UI strings.
- **Multilingual:** select/copy/extract/search must pass Unicode through unchanged (Indonesian, English, 中文, …). Never lowercase/normalize away non-ASCII except the documented case-insensitive fold.
- **TDD:** write the failing test first, watch it fail, implement minimally, watch it pass, commit. Keep the suite green (currently 123 tests).
- **Commands:** `npm test` (Vitest once), `npx vitest run <file>` (single file), `npm run build` (tsc + vite), `npm run lint` (oxlint).

---

### Task 1: `markup-store` — state + types

**Files:**
- Create: `src/services/markup-store.ts`
- Test: `src/services/markup-store.test.ts`

**Interfaces:**
- Consumes: `zustand` `create` (already a dependency).
- Produces:
  - `interface RectPct { xPct: number; yPct: number; wPct: number; hPct: number }`
  - `type MarkupType = 'highlight' | 'underline' | 'strikethrough'`
  - `interface MarkupObject { id: string; page: number; type: MarkupType; color: string; rects: RectPct[] }`
  - `useMarkupStore` (zustand) with `objects: MarkupObject[]`, `addMarkup(page, type, color, rects) => string`, `removeMarkup(id) => void`, `clear() => void`
  - `markupForPage(objects: MarkupObject[], page: number): MarkupObject[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/services/markup-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMarkupStore, markupForPage } from './markup-store'
import type { RectPct } from './markup-store'

const rects: RectPct[] = [{ xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 }]

describe('markup-store', () => {
  beforeEach(() => useMarkupStore.setState({ objects: [] }))

  it('adds a markup and returns its id', () => {
    const id = useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', rects)
    const objs = useMarkupStore.getState().objects
    expect(objs).toHaveLength(1)
    expect(objs[0]).toMatchObject({ id, page: 0, type: 'highlight', color: '#ffd54a', rects })
  })

  it('preserves multi-rect selections intact', () => {
    const multi: RectPct[] = [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
      { xPct: 0.1, yPct: 0.24, wPct: 0.5, hPct: 0.02 },
    ]
    useMarkupStore.getState().addMarkup(2, 'underline', '#000000', multi)
    expect(useMarkupStore.getState().objects[0].rects).toEqual(multi)
  })

  it('removes by id and clears all', () => {
    const id = useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', rects)
    useMarkupStore.getState().addMarkup(1, 'strikethrough', '#000000', rects)
    useMarkupStore.getState().removeMarkup(id)
    expect(useMarkupStore.getState().objects).toHaveLength(1)
    useMarkupStore.getState().clear()
    expect(useMarkupStore.getState().objects).toHaveLength(0)
  })

  it('markupForPage filters by page', () => {
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', rects)
    useMarkupStore.getState().addMarkup(3, 'highlight', '#ffd54a', rects)
    expect(markupForPage(useMarkupStore.getState().objects, 3)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/markup-store.test.ts`
Expected: FAIL — cannot resolve `./markup-store`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/markup-store.ts
import { create } from 'zustand'

export interface RectPct {
  xPct: number
  yPct: number
  wPct: number
  hPct: number
}

export type MarkupType = 'highlight' | 'underline' | 'strikethrough'

export interface MarkupObject {
  id: string
  page: number
  type: MarkupType
  color: string
  rects: RectPct[]
}

let _counter = 0
const nextId = () => `m${++_counter}`

interface MarkupState {
  objects: MarkupObject[]
  addMarkup: (page: number, type: MarkupType, color: string, rects: RectPct[]) => string
  removeMarkup: (id: string) => void
  clear: () => void
}

export const useMarkupStore = create<MarkupState>((set) => ({
  objects: [],
  addMarkup: (page, type, color, rects) => {
    const id = nextId()
    set((s) => ({ objects: [...s.objects, { id, page, type, color, rects }] }))
    return id
  },
  removeMarkup: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),
  clear: () => set({ objects: [] }),
}))

export function markupForPage(objects: MarkupObject[], page: number): MarkupObject[] {
  return objects.filter((o) => o.page === page)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/markup-store.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/markup-store.ts src/services/markup-store.test.ts
git commit -m "feat: add markup-store for text highlight/underline/strikethrough"
```

---

### Task 2: `overlay-coords` — `rectPctToPdfRotated` for markup rects

**Files:**
- Modify: `src/services/overlay-coords.ts` (append a new export)
- Test: `src/services/overlay-coords.test.ts` (append cases)

**Interfaces:**
- Consumes: `RectPct` from `./markup-store` (Task 1).
- Produces: `rectPctToPdfRotated(rect: RectPct, pageW: number, pageH: number, rotationDeg: number): { x: number; y: number; width: number; height: number; rotate: 0 | 90 | 180 | 270 }`
  - Maps a visual-frame axis-aligned rect (percent) into UNROTATED PDF user space (origin bottom-left), returning the bottom-left anchor + visual width/height + the `rotate` (= page `/Rotate`) so `pdf-lib` `drawRectangle` lands upright in the visual frame. This mirrors the image branch of `rectToPdfRotated`.

- [ ] **Step 1: Write the failing test** (append to `overlay-coords.test.ts`)

```ts
import { rectPctToPdfRotated } from './overlay-coords'
import type { RectPct } from './markup-store'

describe('rectPctToPdfRotated', () => {
  const W = 600, H = 800
  const r: RectPct = { xPct: 0.1, yPct: 0.2, wPct: 0.4, hPct: 0.05 }

  it('R=0 maps top-left visual rect to bottom-left PDF anchor', () => {
    const out = rectPctToPdfRotated(r, W, H, 0)
    // visual: x=60, y=160, w=240, h=40 → PDF bottom-left y = H - (160+40) = 600
    expect(out).toMatchObject({ x: 60, width: 240, height: 40, rotate: 0 })
    expect(out.y).toBeCloseTo(600, 6)
  })

  it('swaps width/height axes for 90/270 and reports rotate', () => {
    const out90 = rectPctToPdfRotated(r, W, H, 90)
    expect(out90.rotate).toBe(90)
    // visual width uses VW=H=800 → width = 0.4*800 = 320
    expect(out90.width).toBeCloseTo(320, 6)
    expect(out90.height).toBeCloseTo(0.05 * 600, 6) // VH=W=600
    expect(rectPctToPdfRotated(r, W, H, 270).rotate).toBe(270)
  })

  it('R=180 keeps axes but flips anchor', () => {
    const out = rectPctToPdfRotated(r, W, H, 180)
    expect(out).toMatchObject({ rotate: 180, width: 240, height: 40 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/overlay-coords.test.ts`
Expected: FAIL — `rectPctToPdfRotated` is not exported.

- [ ] **Step 3: Write minimal implementation** (append to `overlay-coords.ts`)

```ts
import type { RectPct } from './markup-store'

/**
 * Rotation-aware placement of a visual-frame axis-aligned rectangle (percent)
 * into UNROTATED PDF user space, for pdf-lib drawRectangle. Same V→U inversion
 * as the image branch of rectToPdfRotated; anchor = visual bottom-left corner.
 */
export function rectPctToPdfRotated(
  rect: RectPct,
  pageW: number,
  pageH: number,
  rotationDeg: number,
) {
  const R = (((Math.round(rotationDeg) % 360) + 360) % 360) as 0 | 90 | 180 | 270
  const swap = R === 90 || R === 270
  const VW = swap ? pageH : pageW
  const VH = swap ? pageW : pageH

  const vx = rect.xPct * VW
  const vy = rect.yPct * VH
  const vw = rect.wPct * VW
  const vh = rect.hPct * VH

  const vToU = (x: number, y: number): { x: number; y: number } => {
    switch (R) {
      case 90:
        return { x: y, y: x }
      case 180:
        return { x: pageW - x, y }
      case 270:
        return { x: pageW - y, y: pageH - x }
      case 0:
      default:
        return { x, y: pageH - y }
    }
  }

  const anchor = vToU(vx, vy + vh) // visual bottom-left
  return { x: anchor.x, y: anchor.y, width: vw, height: vh, rotate: R }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/overlay-coords.test.ts`
Expected: PASS (existing cases + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/services/overlay-coords.ts src/services/overlay-coords.test.ts
git commit -m "feat: add rectPctToPdfRotated for markup rectangle placement"
```

---

### Task 3: `flatten` — draw markup into the PDF + wire the export call site

**Files:**
- Modify: `src/services/flatten.ts` (add optional `markup` param + drawing)
- Modify: `src/App.tsx:381` (pass markup objects at export)
- Test: `src/services/flatten.test.ts` (append)

**Interfaces:**
- Consumes: `MarkupObject`/`RectPct` (Task 1), `rectPctToPdfRotated`/`hexToRgb01` (Task 2 + existing).
- Produces: new signature `flattenObjects(bytes: Uint8Array, objects: OverlayObject[], markup?: MarkupObject[]): Promise<Uint8Array>`. Backward compatible — `markup` defaults to `[]`.

- [ ] **Step 1: Write the failing test** (append to `flatten.test.ts`)

```ts
import type { MarkupObject } from './markup-store'

describe('flattenObjects — markup', () => {
  it('draws highlight/underline/strikethrough without changing page count', async () => {
    const bytes = await blankPdf(1)
    const markup: MarkupObject[] = [
      { id: 'm1', page: 0, type: 'highlight', color: '#ffd54a',
        rects: [{ xPct: 0.1, yPct: 0.2, wPct: 0.4, hPct: 0.03 }] },
      { id: 'm2', page: 0, type: 'underline', color: '#000000',
        rects: [{ xPct: 0.1, yPct: 0.3, wPct: 0.4, hPct: 0.03 }] },
      { id: 'm3', page: 0, type: 'strikethrough', color: '#000000',
        rects: [{ xPct: 0.1, yPct: 0.4, wPct: 0.4, hPct: 0.03 }] },
    ]
    const out = await flattenObjects(bytes, [], markup)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(1)
    expect(out.length).toBeGreaterThan(bytes.length) // content was added
  })

  it('skips markup on out-of-range pages', async () => {
    const bytes = await blankPdf(1)
    const markup: MarkupObject[] = [
      { id: 'm1', page: 9, type: 'highlight', color: '#ffd54a',
        rects: [{ xPct: 0.1, yPct: 0.2, wPct: 0.4, hPct: 0.03 }] },
    ]
    const out = await flattenObjects(bytes, [], markup)
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })

  it('is backward compatible when markup omitted', async () => {
    const bytes = await blankPdf(1)
    const out = await flattenObjects(bytes, [])
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/flatten.test.ts`
Expected: FAIL — `flattenObjects` takes 2 args / markup not drawn (length assertion fails).

- [ ] **Step 3: Write minimal implementation**

In `src/services/flatten.ts`, update imports and signature, and draw markup after overlays.

Update the import line and add the markup import:

```ts
import { rectToPdfRotated, hexToRgb01, rectPctToPdfRotated } from './overlay-coords'
import type { MarkupObject } from './markup-store'
```

Change the signature:

```ts
export async function flattenObjects(
  bytes: Uint8Array,
  objects: OverlayObject[],
  markup: MarkupObject[] = [],
): Promise<Uint8Array> {
```

Then, immediately BEFORE the final `return doc.save()`, insert the markup-drawing loop:

```ts
  // ── Markup: highlight (filled, semi-transparent), underline & strikethrough
  //    (thin bars). Text is already in the page content, so a 0.4-opacity fill
  //    reads like a highlighter. ──────────────────────────────────────────────
  for (const m of markup) {
    if (m.page < 0 || m.page >= pageCount) continue
    const page = doc.getPage(m.page)
    const { width: pw, height: ph } = page.getSize()
    const rotationDeg = page.getRotation().angle
    const c = hexToRgb01(m.color)
    const color = rgb(c.r, c.g, c.b)
    for (const rect of m.rects) {
      const r = rectPctToPdfRotated(rect, pw, ph, rotationDeg)
      const rotate = pdfDegrees(r.rotate)
      if (m.type === 'highlight') {
        page.drawRectangle({
          x: r.x, y: r.y, width: r.width, height: r.height, rotate,
          color, opacity: 0.4,
        })
      } else {
        // underline sits at the bottom of the rect; strikethrough at the middle.
        const barH = Math.max(1, r.height * 0.08)
        const yOffset = m.type === 'underline' ? 0 : r.height / 2 - barH / 2
        page.drawRectangle({
          x: r.x, y: r.y + yOffset, width: r.width, height: barH, rotate,
          color, opacity: 1,
        })
      }
    }
  }
```

Now wire the export call site in `src/App.tsx`. Add the import near the other service imports:

```ts
import { useMarkupStore } from './services/markup-store'
```

Replace line 381 (the flatten call in `doExport`):

```ts
      const objs = useOverlayStore.getState().objects
      const marks = useMarkupStore.getState().objects
      const outBytes =
        objs.length || marks.length ? await flattenObjects(bytes, objs, marks) : bytes
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/flatten.test.ts` → PASS (existing 3 + new 3).
Run: `npm run build` → typechecks clean (App.tsx call site matches new signature).

- [ ] **Step 5: Commit**

```bash
git add src/services/flatten.ts src/App.tsx src/services/flatten.test.ts
git commit -m "feat: flatten text markup into exported PDF"
```

---

### Task 4: `file-io` — `downloadText` for .txt extraction

**Files:**
- Modify: `src/services/file-io.ts`
- Test: `src/services/file-io.test.ts` (append)

**Interfaces:**
- Produces: `downloadText(text: string, fileName: string): void` — downloads a UTF-8 `text/plain` blob. Same anchor-click pattern as `downloadBytes`.

- [ ] **Step 1: Write the failing test** (append to `file-io.test.ts`)

```ts
import { downloadText } from './file-io'

describe('downloadText', () => {
  it('creates a text/plain object URL and triggers a click', () => {
    const createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clicks: string[] = []
    const origClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push(this.download)
    }
    downloadText('中文 hello', 'notes.txt')
    expect(createURL).toHaveBeenCalledOnce()
    const blob = createURL.mock.calls[0][0] as Blob
    expect(blob.type).toContain('text/plain')
    expect(clicks).toContain('notes.txt')
    HTMLAnchorElement.prototype.click = origClick
  })
})
```

Add `import { describe, it, expect, vi } from 'vitest'` at the top if not already present in the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/file-io.test.ts`
Expected: FAIL — `downloadText` not exported.

- [ ] **Step 3: Write minimal implementation** (append to `file-io.ts`)

```ts
export function downloadText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/file-io.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/file-io.ts src/services/file-io.test.ts
git commit -m "feat: add downloadText helper for .txt export"
```

---

### Task 5: `text-service` — extract & search (pure logic, fake-doc tested)

**Files:**
- Create: `src/services/text-service.ts`
- Test: `src/services/text-service.test.ts`

**Interfaces:**
- Produces (this task adds the non-DOM functions; `renderTextLayer` is Task 6):
  - `interface TextItemLike { str: string; hasEOL?: boolean }`
  - `interface PageTextSource { getTextContent(): Promise<{ items: TextItemLike[] }> }`
  - `interface DocTextSource { numPages: number; getPage(n: number): Promise<PageTextSource> }`
  - `getPageText(page: PageTextSource): Promise<string>`
  - `extractDocumentText(doc: DocTextSource): Promise<string>` — pages joined with `\n\n`
  - `interface SearchOptions { caseSensitive?: boolean }`
  - `interface SearchHit { pageIndex: number; itemIndex: number; start: number; length: number }`
  - `searchPageText(items: TextItemLike[], query: string, opts?: SearchOptions): Array<{ itemIndex: number; start: number; length: number }>`
  - `searchDocument(doc: DocTextSource, query: string, opts?: SearchOptions): Promise<SearchHit[]>`

Note: `PDFDocumentProxy` from pdf.js is structurally compatible with `DocTextSource` (`numPages`, `getPage`), and `PDFPageProxy` with `PageTextSource` — real callers pass the pdf.js objects; tests pass fakes. This is the codebase's established way to avoid loading pdf.js in jsdom.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/text-service.test.ts
import { describe, it, expect } from 'vitest'
import {
  getPageText, extractDocumentText, searchPageText, searchDocument,
} from './text-service'
import type { DocTextSource, TextItemLike } from './text-service'

const page = (items: TextItemLike[]) => ({ getTextContent: async () => ({ items }) })

function fakeDoc(pages: TextItemLike[][]): DocTextSource {
  return { numPages: pages.length, getPage: async (n: number) => page(pages[n - 1]) }
}

describe('text-service — extract', () => {
  it('joins item strings and inserts newlines on hasEOL', async () => {
    const text = await getPageText(page([
      { str: 'Hello ' }, { str: 'world', hasEOL: true }, { str: 'second line' },
    ]))
    expect(text).toBe('Hello world\nsecond line')
  })

  it('preserves non-ASCII (中文, Indonesian) verbatim', async () => {
    const text = await getPageText(page([{ str: '中文 ' }, { str: 'terima kasih' }]))
    expect(text).toBe('中文 terima kasih')
  })

  it('extractDocumentText joins pages with a blank line', async () => {
    const doc = fakeDoc([[{ str: 'p1' }], [{ str: 'p2' }]])
    expect(await extractDocumentText(doc)).toBe('p1\n\np2')
  })
})

describe('text-service — search', () => {
  const items: TextItemLike[] = [
    { str: 'the Fox' }, { str: 'jumped over the fox' },
  ]

  it('finds case-insensitive matches by default across items', () => {
    const hits = searchPageText(items, 'fox')
    // item 0: "the Fox" → start 4 ; item 1: "...the fox" → start 16
    expect(hits).toEqual([
      { itemIndex: 0, start: 4, length: 3 },
      { itemIndex: 1, start: 16, length: 3 },
    ])
  })

  it('respects caseSensitive', () => {
    expect(searchPageText(items, 'Fox', { caseSensitive: true }))
      .toEqual([{ itemIndex: 0, start: 4, length: 3 }])
  })

  it('empty query yields no hits', () => {
    expect(searchPageText(items, '')).toEqual([])
  })

  it('searchDocument tags hits with pageIndex', async () => {
    const doc = fakeDoc([[{ str: 'aXa' }], [{ str: 'bb' }, { str: 'Xy' }]])
    const hits = await searchDocument(doc, 'x')
    expect(hits).toEqual([
      { pageIndex: 0, itemIndex: 0, start: 1, length: 1 },
      { pageIndex: 1, itemIndex: 1, start: 0, length: 1 },
    ])
  })

  it('finds 中文 matches (unicode)', async () => {
    const doc = fakeDoc([[{ str: '你好中文世界' }]])
    const hits = await searchDocument(doc, '中文')
    expect(hits).toEqual([{ pageIndex: 0, itemIndex: 0, start: 2, length: 2 }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/text-service.test.ts`
Expected: FAIL — cannot resolve `./text-service`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/text-service.ts
export interface TextItemLike {
  str: string
  hasEOL?: boolean
}
export interface PageTextSource {
  getTextContent(): Promise<{ items: TextItemLike[] }>
}
export interface DocTextSource {
  numPages: number
  getPage(n: number): Promise<PageTextSource>
}

export interface SearchOptions {
  caseSensitive?: boolean
}
export interface SearchHit {
  pageIndex: number
  itemIndex: number
  start: number
  length: number
}

/** Concatenate a page's text items, inserting a newline after items flagged
 *  hasEOL (pdf.js marks end-of-line items). Unicode is passed through verbatim. */
export async function getPageText(page: PageTextSource): Promise<string> {
  const { items } = await page.getTextContent()
  let out = ''
  for (const it of items) {
    out += it.str
    if (it.hasEOL) out += '\n'
  }
  return out
}

export async function extractDocumentText(doc: DocTextSource): Promise<string> {
  const parts: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    parts.push(await getPageText(await doc.getPage(n)))
  }
  return parts.join('\n\n')
}

export function searchPageText(
  items: TextItemLike[],
  query: string,
  opts: SearchOptions = {},
): Array<{ itemIndex: number; start: number; length: number }> {
  const hits: Array<{ itemIndex: number; start: number; length: number }> = []
  if (!query) return hits
  const needle = opts.caseSensitive ? query : query.toLowerCase()
  items.forEach((it, itemIndex) => {
    const hay = opts.caseSensitive ? it.str : it.str.toLowerCase()
    let from = 0
    for (;;) {
      const idx = hay.indexOf(needle, from)
      if (idx === -1) break
      hits.push({ itemIndex, start: idx, length: query.length })
      from = idx + needle.length
    }
  })
  return hits
}

export async function searchDocument(
  doc: DocTextSource,
  query: string,
  opts: SearchOptions = {},
): Promise<SearchHit[]> {
  const hits: SearchHit[] = []
  if (!query) return hits
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent()
    for (const h of searchPageText(items, query, opts)) {
      hits.push({ pageIndex: n - 1, ...h })
    }
  }
  return hits
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/text-service.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/services/text-service.ts src/services/text-service.test.ts
git commit -m "feat: add text extraction and search to text-service"
```

---

### Task 6: `text-service` — `renderTextLayer` (pdf.js TextLayer wrapper)

**Files:**
- Modify: `src/services/text-service.ts` (add `renderTextLayer`)
- Create: `src/text-layer.css` (text-layer + grey ::selection styles)
- Modify: `src/main.tsx` (import the css)
- Test: `src/services/textLayer.test.ts` (behavior test with a mocked `TextLayer`)

**Interfaces:**
- Consumes: `pdfjs-dist` `TextLayer`, a `PDFPageProxy`-like object with `getTextContent()` and `getViewport({ scale })`.
- Produces: `renderTextLayer(page, scale, container): { cancel(): void; done: Promise<void> }` — builds pdf.js text spans into `container`, sized to the viewport at `scale`, cancellable (mirrors `renderPageToCanvas`'s handle shape). Sets `container` class `textLayer` and `--scale-factor`.

Note on alignment (the spec's main risk): the canvas renders at `scale * dpr` but is CSS-displayed at `scale` (see `render-service.ts:168`). The text layer must therefore use the viewport at **`scale`** (CSS px) and set `--scale-factor: <scale>` on the container. Unit tests can only assert we call pdf.js with the right geometry; true pixel alignment is verified in Task 12's Playwright check.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/textLayer.test.ts
import { describe, it, expect, vi } from 'vitest'

const renderSpy = vi.fn().mockResolvedValue(undefined)
const cancelSpy = vi.fn()
const ctor = vi.fn()

vi.mock('pdfjs-dist', () => ({
  TextLayer: class {
    constructor(opts: unknown) { ctor(opts) }
    render() { return renderSpy() }
    cancel() { cancelSpy() }
  },
  GlobalWorkerOptions: { workerSrc: '' },
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker' }))

import { renderTextLayer } from './text-service'

function fakePage() {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: 300 * scale, height: 400 * scale }),
    getTextContent: async () => ({ items: [{ str: 'hi' }] }),
  }
}

describe('renderTextLayer', () => {
  it('builds a TextLayer at the given scale and sets the container up', async () => {
    const container = document.createElement('div')
    const handle = renderTextLayer(fakePage() as never, 2, container)
    await handle.done
    expect(ctor).toHaveBeenCalledOnce()
    const opts = ctor.mock.calls[0][0] as { viewport: { width: number }; container: HTMLElement }
    expect(opts.container).toBe(container)
    expect(opts.viewport.width).toBe(600) // 300 * scale(2)
    expect(container.classList.contains('textLayer')).toBe(true)
    expect(container.style.getPropertyValue('--scale-factor')).toBe('2')
    expect(renderSpy).toHaveBeenCalled()
  })

  it('cancel() forwards to the TextLayer', async () => {
    const container = document.createElement('div')
    const handle = renderTextLayer(fakePage() as never, 1, container)
    await handle.done
    handle.cancel()
    expect(cancelSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/textLayer.test.ts`
Expected: FAIL — `renderTextLayer` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/services/text-service.ts`:

```ts
import type { PDFPageProxy } from 'pdfjs-dist'

let _pdfjs: Promise<typeof import('pdfjs-dist')> | null = null
function pdfjsLib() {
  return (_pdfjs ??= import('pdfjs-dist'))
}

/**
 * Render pdf.js's transparent, positioned text spans into `container`, aligned
 * to the page canvas. The canvas is displayed at CSS size `scale` (it renders
 * internally at scale*dpr), so the text layer uses the viewport at `scale` and
 * sets --scale-factor to match. Returns a cancellable handle like
 * renderPageToCanvas.
 */
export function renderTextLayer(
  page: PDFPageProxy,
  scale: number,
  container: HTMLElement,
): { cancel(): void; done: Promise<void> } {
  let layer: { render(): Promise<void>; cancel(): void } | null = null
  let cancelled = false

  const done = (async () => {
    const pdfjs = await pdfjsLib()
    const viewport = page.getViewport({ scale })
    if (cancelled) return
    container.textContent = ''
    container.classList.add('textLayer')
    container.style.setProperty('--scale-factor', String(scale))
    container.style.width = `${viewport.width}px`
    container.style.height = `${viewport.height}px`
    const textContentSource = await page.getTextContent()
    if (cancelled) return
    layer = new pdfjs.TextLayer({ textContentSource, container, viewport }) as unknown as {
      render(): Promise<void>
      cancel(): void
    }
    await layer.render()
  })()

  return {
    cancel() {
      cancelled = true
      layer?.cancel()
    },
    done,
  }
}
```

Create `src/text-layer.css`:

```css
/* pdf.js text layer — transparent, glyph-aligned spans over the canvas.
   Minimal rules distilled from pdfjs-dist/web/pdf_viewer.css. */
.textLayer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  line-height: 1;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  z-index: 1;
}
.textLayer span,
.textLayer br {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}
/* "as usual" neutral grey selection while dragging (temporary, not persisted) */
.textLayer ::selection {
  background: rgba(120, 120, 120, 0.4);
}
```

In `src/main.tsx`, add near the other imports:

```ts
import './text-layer.css'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/textLayer.test.ts` → PASS.
Run: `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/services/text-service.ts src/text-layer.css src/main.tsx src/services/textLayer.test.ts
git commit -m "feat: add pdf.js text-layer renderer with grey selection"
```

---

### Task 7: `selection-util` — convert selection client rects to page percentages

**Files:**
- Create: `src/services/selection-util.ts`
- Test: `src/services/selection-util.test.ts`

**Interfaces:**
- Consumes: `RectPct` (Task 1).
- Produces: `clientRectsToPct(rects: Array<{ left: number; top: number; width: number; height: number }>, wrapper: { left: number; top: number; width: number; height: number }): RectPct[]` — maps DOM client rects into page-relative percentages, dropping zero-area rects.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/selection-util.test.ts
import { describe, it, expect } from 'vitest'
import { clientRectsToPct } from './selection-util'

describe('clientRectsToPct', () => {
  const wrapper = { left: 100, top: 50, width: 400, height: 800 }

  it('maps a client rect into page percentages', () => {
    const out = clientRectsToPct(
      [{ left: 140, top: 90, width: 80, height: 16 }], wrapper,
    )
    expect(out).toEqual([{ xPct: 0.1, yPct: 0.05, wPct: 0.2, hPct: 0.02 }])
  })

  it('drops zero-area rects', () => {
    const out = clientRectsToPct(
      [{ left: 140, top: 90, width: 0, height: 16 },
       { left: 140, top: 90, width: 80, height: 16 }], wrapper,
    )
    expect(out).toHaveLength(1)
  })

  it('returns empty for empty input', () => {
    expect(clientRectsToPct([], wrapper)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/selection-util.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/selection-util.ts
import type { RectPct } from './markup-store'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Convert DOM client rects (e.g. from a Selection Range) into page-relative
 *  percentages against the page wrapper's bounding box. Zero-area rects are
 *  dropped (browsers emit spurious empties at line boundaries). */
export function clientRectsToPct(rects: Box[], wrapper: Box): RectPct[] {
  const out: RectPct[] = []
  for (const r of rects) {
    if (r.width <= 0 || r.height <= 0) continue
    out.push({
      xPct: (r.left - wrapper.left) / wrapper.width,
      yPct: (r.top - wrapper.top) / wrapper.height,
      wPct: r.width / wrapper.width,
      hPct: r.height / wrapper.height,
    })
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/selection-util.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/selection-util.ts src/services/selection-util.test.ts
git commit -m "feat: add clientRectsToPct selection→percentage helper"
```

---

### Task 8: i18n — add all new UI strings (en + zh + Dict)

**Files:**
- Modify: `src/services/i18n.tsx` (add keys to `en`, `zh`, and `Dict`)

**Interfaces:**
- Produces new `Dict` keys used by Tasks 9–12: `tlCopy`, `tlHighlight`, `tlUnderline`, `tlStrikethrough`, `tlSearchThis`, `tlCopied`, `tlSearch`, `tlSearchPlaceholder`, `tlNoMatches`, `tlMatchOf` (function `(cur, total) => string`), `tlPrevMatch`, `tlNextMatch`, `tlCloseSearch`, `tlExtractText`, `tlDeleteMarkup`.

- [ ] **Step 1: Add strings to the `en` dictionary**

In `src/services/i18n.tsx`, inside the `en` object, after `exDownload: 'Download',`:

```ts
  // Text layer / selection popup / search
  tlCopy: 'Copy',
  tlHighlight: 'Highlight',
  tlUnderline: 'Underline',
  tlStrikethrough: 'Strikethrough',
  tlSearchThis: 'Search this text',
  tlCopied: 'Copied',
  tlSearch: 'Search',
  tlSearchPlaceholder: 'Find in document',
  tlNoMatches: 'No matches',
  tlMatchOf: (cur: number, total: number) => `${cur} / ${total}`,
  tlPrevMatch: 'Previous match',
  tlNextMatch: 'Next match',
  tlCloseSearch: 'Close search',
  tlExtractText: 'Extract text',
  tlDeleteMarkup: 'Delete markup',
```

- [ ] **Step 2: Add the same keys to the `zh` dictionary**

Inside the `zh` object, after `exDownload: '下載',`:

```ts
  // Text layer / selection popup / search
  tlCopy: '複製',
  tlHighlight: '螢光標示',
  tlUnderline: '底線',
  tlStrikethrough: '刪除線',
  tlSearchThis: '搜尋此文字',
  tlCopied: '已複製',
  tlSearch: '搜尋',
  tlSearchPlaceholder: '在文件中尋找',
  tlNoMatches: '沒有符合項目',
  tlMatchOf: (cur: number, total: number) => `第 ${cur} / ${total} 筆`,
  tlPrevMatch: '上一筆',
  tlNextMatch: '下一筆',
  tlCloseSearch: '關閉搜尋',
  tlExtractText: '擷取文字',
  tlDeleteMarkup: '刪除標記',
```

- [ ] **Step 3: Add the keys to the `Dict` interface**

Inside `interface Dict`, after `exDownload: string`:

```ts
  tlCopy: string
  tlHighlight: string
  tlUnderline: string
  tlStrikethrough: string
  tlSearchThis: string
  tlCopied: string
  tlSearch: string
  tlSearchPlaceholder: string
  tlNoMatches: string
  tlMatchOf: (cur: number, total: number) => string
  tlPrevMatch: string
  tlNextMatch: string
  tlCloseSearch: string
  tlExtractText: string
  tlDeleteMarkup: string
```

- [ ] **Step 4: Verify the build typechecks**

Run: `npm run build`
Expected: clean (both dictionaries satisfy `Dict`; a missing key in either would error here).

- [ ] **Step 5: Commit**

```bash
git add src/services/i18n.tsx
git commit -m "i18n: add text-layer, selection popup, and search strings"
```

---

### Task 9: `MarkupLayer` component — render persistent markup

**Files:**
- Create: `src/components/MarkupLayer.tsx`
- Test: `src/components/markupLayer.test.tsx`

**Interfaces:**
- Consumes: `useMarkupStore`, `markupForPage`, `MarkupObject` (Task 1); `useI18n` (`tlDeleteMarkup`).
- Produces: `<MarkupLayer page={number} />` — absolutely-positioned overlay (inset:0) rendering each markup rect. Highlight = semi-transparent fill; underline = bottom bar; strikethrough = mid bar. Clicking a markup shows a small delete button that calls `removeMarkup`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/markupLayer.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MarkupLayer from './MarkupLayer'
import { useMarkupStore } from '../services/markup-store'
import { I18nProvider } from '../services/i18n'

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>)

describe('MarkupLayer', () => {
  beforeEach(() => useMarkupStore.setState({ objects: [] }))

  it('renders one element per markup rect on the page', () => {
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
      { xPct: 0.1, yPct: 0.24, wPct: 0.4, hPct: 0.02 },
    ])
    renderWithI18n(<MarkupLayer page={0} />)
    expect(screen.getAllByTestId('markup-rect')).toHaveLength(2)
  })

  it('does not render markup from other pages', () => {
    useMarkupStore.getState().addMarkup(1, 'highlight', '#ffd54a', [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
    ])
    renderWithI18n(<MarkupLayer page={0} />)
    expect(screen.queryByTestId('markup-rect')).toBeNull()
  })

  it('clicking a markup then delete removes it', () => {
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
    ])
    renderWithI18n(<MarkupLayer page={0} />)
    fireEvent.click(screen.getAllByTestId('markup-rect')[0])
    fireEvent.click(screen.getByLabelText('Delete markup'))
    expect(useMarkupStore.getState().objects).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/markupLayer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/MarkupLayer.tsx
import { useState } from 'react'
import { useMarkupStore, markupForPage } from '../services/markup-store'
import type { MarkupObject, RectPct } from '../services/markup-store'
import { useI18n } from '../services/i18n'

function rectStyle(m: MarkupObject, r: RectPct): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: `${r.xPct * 100}%`,
    top: `${r.yPct * 100}%`,
    width: `${r.wPct * 100}%`,
    height: `${r.hPct * 100}%`,
    pointerEvents: 'auto',
    cursor: 'pointer',
  }
  if (m.type === 'highlight') {
    return { ...base, background: m.color, opacity: 0.4 }
  }
  // underline / strikethrough: a thin bar drawn with a border on a zero-fill box
  const barTop = m.type === 'underline' ? '100%' : '50%'
  return {
    ...base,
    borderTop: `2px solid ${m.color}`,
    height: 0,
    top: `calc(${r.yPct * 100}% + ${r.hPct * 100}% * ${m.type === 'underline' ? 1 : 0.5})`,
    transform: barTop === '100%' ? 'none' : 'none',
  }
}

export default function MarkupLayer({ page }: { page: number }) {
  const { objects, removeMarkup } = useMarkupStore()
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pageMarkup = markupForPage(objects, page)

  return (
    <div
      data-testid="markup-layer"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}
    >
      {pageMarkup.map((m) =>
        m.rects.map((r, i) => (
          <div
            key={`${m.id}-${i}`}
            data-testid="markup-rect"
            style={rectStyle(m, r)}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedId(m.id)
            }}
          >
            {selectedId === m.id && i === 0 && (
              <button
                aria-label={t.tlDeleteMarkup}
                onClick={(e) => {
                  e.stopPropagation()
                  removeMarkup(m.id)
                  setSelectedId(null)
                }}
                style={{
                  position: 'absolute', top: -22, right: 0, fontSize: 12, lineHeight: 1,
                  background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4,
                  padding: '2px 6px', cursor: 'pointer', pointerEvents: 'auto',
                }}
              >
                ✕
              </button>
            )}
          </div>
        )),
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/markupLayer.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/MarkupLayer.tsx src/components/markupLayer.test.tsx
git commit -m "feat: add MarkupLayer to render highlight/underline/strikethrough"
```

---

### Task 10: `SelectionPopup` component — floating actions on text selection

**Files:**
- Create: `src/components/SelectionPopup.tsx`
- Test: `src/components/selectionPopup.test.tsx`

**Interfaces:**
- Consumes: `useI18n` (tl* keys), `MarkupType` (Task 1).
- Produces: `<SelectionPopup pos={{x,y} | null} selectedText={string} onCopy() onMark(type, color) onSearch() onDismiss() />`.
  - Renders nothing when `pos` is null or `selectedText` is empty.
  - Buttons: Copy, Highlight (+ swatch row: `#ffd54a` yellow, `#a5f3a0` green, `#f7a8c4` pink, `#a8c9f7` blue → clicking Highlight uses yellow; clicking a swatch uses that color), Underline, Strikethrough, Search this text.
  - Positions with `left: pos.x, top: pos.y` (fixed).

Note: the parent (Task 12) owns selection detection (reads `window.getSelection()`), computes `pos`/`selectedText`, and implements the callbacks (clipboard, markup-store, search). This component is presentational so it is unit-testable without a real selection.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/selectionPopup.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SelectionPopup from './SelectionPopup'
import { I18nProvider } from '../services/i18n'

const setup = (over: Partial<React.ComponentProps<typeof SelectionPopup>> = {}) => {
  const props = {
    pos: { x: 10, y: 20 },
    selectedText: 'hello',
    onCopy: vi.fn(),
    onMark: vi.fn(),
    onSearch: vi.fn(),
    onDismiss: vi.fn(),
    ...over,
  }
  render(<I18nProvider><SelectionPopup {...props} /></I18nProvider>)
  return props
}

describe('SelectionPopup', () => {
  it('renders nothing without a selection', () => {
    const { container } = render(
      <I18nProvider><SelectionPopup pos={null} selectedText="" onCopy={() => {}}
        onMark={() => {}} onSearch={() => {}} onDismiss={() => {}} /></I18nProvider>,
    )
    expect(container.querySelector('[data-testid="selection-popup"]')).toBeNull()
  })

  it('Copy button fires onCopy', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Copy'))
    expect(p.onCopy).toHaveBeenCalledOnce()
  })

  it('Highlight applies default yellow', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Highlight'))
    expect(p.onMark).toHaveBeenCalledWith('highlight', '#ffd54a')
  })

  it('Underline and Strikethrough fire with their type', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Underline'))
    fireEvent.click(screen.getByLabelText('Strikethrough'))
    expect(p.onMark).toHaveBeenCalledWith('underline', '#000000')
    expect(p.onMark).toHaveBeenCalledWith('strikethrough', '#000000')
  })

  it('Search this text fires onSearch', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Search this text'))
    expect(p.onSearch).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/selectionPopup.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/SelectionPopup.tsx
import { useI18n } from '../services/i18n'
import type { MarkupType } from '../services/markup-store'

export interface SelectionPopupProps {
  pos: { x: number; y: number } | null
  selectedText: string
  onCopy: () => void
  onMark: (type: MarkupType, color: string) => void
  onSearch: () => void
  onDismiss: () => void
}

const SWATCHES = ['#ffd54a', '#a5f3a0', '#f7a8c4', '#a8c9f7']

const btn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#f9fafb',
  fontSize: 13, padding: '4px 8px', cursor: 'pointer', borderRadius: 4, whiteSpace: 'nowrap',
}

export default function SelectionPopup({
  pos, selectedText, onCopy, onMark, onSearch,
}: SelectionPopupProps) {
  const { t } = useI18n()
  if (!pos || !selectedText) return null

  return (
    <div
      data-testid="selection-popup"
      onMouseDown={(e) => e.preventDefault()} // keep the selection alive on click
      style={{
        position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)',
        display: 'flex', alignItems: 'center', gap: 2, zIndex: 1100,
        background: '#1f2937', borderRadius: 8, padding: '4px 6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}
    >
      <button aria-label={t.tlCopy} style={btn} onClick={onCopy}>{t.tlCopy}</button>
      <button aria-label={t.tlHighlight} style={btn} onClick={() => onMark('highlight', SWATCHES[0])}>
        {t.tlHighlight}
      </button>
      <span style={{ display: 'flex', gap: 3, padding: '0 2px' }}>
        {SWATCHES.map((c) => (
          <button
            key={c}
            aria-label={`${t.tlHighlight} ${c}`}
            onClick={() => onMark('highlight', c)}
            style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #ffffff55',
              background: c, cursor: 'pointer', padding: 0 }}
          />
        ))}
      </span>
      <button aria-label={t.tlUnderline} style={btn} onClick={() => onMark('underline', '#000000')}>
        {t.tlUnderline}
      </button>
      <button aria-label={t.tlStrikethrough} style={btn} onClick={() => onMark('strikethrough', '#000000')}>
        {t.tlStrikethrough}
      </button>
      <button aria-label={t.tlSearchThis} style={btn} onClick={onSearch}>🔍</button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/selectionPopup.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/SelectionPopup.tsx src/components/selectionPopup.test.tsx
git commit -m "feat: add SelectionPopup floating toolbar for text selection"
```

---

### Task 11: `SearchBar` component — Ctrl+F find UI

**Files:**
- Create: `src/components/SearchBar.tsx`
- Test: `src/components/searchBar.test.tsx`

**Interfaces:**
- Consumes: `useI18n` (tl* keys).
- Produces: `<SearchBar query totalMatches currentIndex onQueryChange(q) onPrev() onNext() onClose() />`.
  - Shows an input (value = `query`), a count (`tlMatchOf(currentIndex+1, totalMatches)` when `totalMatches>0`, else `tlNoMatches` when query non-empty), prev/next buttons (disabled when no matches), and a close button.
  - Typing calls `onQueryChange`; Enter calls `onNext`; Escape calls `onClose`.

Note: parent (Task 12) runs `searchDocument`, owns `totalMatches`/`currentIndex`, and does the scroll-to-match. This keeps SearchBar presentational and testable.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/searchBar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from './SearchBar'
import { I18nProvider } from '../services/i18n'

const setup = (over = {}) => {
  const props = {
    query: 'fox', totalMatches: 3, currentIndex: 0,
    onQueryChange: vi.fn(), onPrev: vi.fn(), onNext: vi.fn(), onClose: vi.fn(),
    ...over,
  }
  render(<I18nProvider><SearchBar {...props} /></I18nProvider>)
  return props
}

describe('SearchBar', () => {
  it('shows the match count', () => {
    setup()
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })

  it('shows "No matches" when query has no hits', () => {
    setup({ totalMatches: 0, currentIndex: -1 })
    expect(screen.getByText('No matches')).toBeTruthy()
  })

  it('typing fires onQueryChange', () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText('Find in document'), { target: { value: 'cat' } })
    expect(p.onQueryChange).toHaveBeenCalledWith('cat')
  })

  it('Enter → next, Escape → close', () => {
    const p = setup()
    const input = screen.getByLabelText('Find in document')
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(p.onNext).toHaveBeenCalledOnce()
    expect(p.onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/searchBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/SearchBar.tsx
import { useI18n } from '../services/i18n'

export interface SearchBarProps {
  query: string
  totalMatches: number
  currentIndex: number
  onQueryChange: (q: string) => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#374151', fontSize: 14, padding: '4px 8px', borderRadius: 4,
}

export default function SearchBar({
  query, totalMatches, currentIndex, onQueryChange, onPrev, onNext, onClose,
}: SearchBarProps) {
  const { t } = useI18n()
  const noMatches = query.length > 0 && totalMatches === 0
  return (
    <div
      data-testid="search-bar"
      style={{
        position: 'absolute', top: 12, right: 16, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
        padding: '4px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      <input
        aria-label={t.tlSearchPlaceholder}
        placeholder={t.tlSearchPlaceholder}
        value={query}
        autoFocus
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNext()
          else if (e.key === 'Escape') onClose()
        }}
        style={{ border: 'none', outline: 'none', fontSize: 13, width: 180, color: '#111827' }}
      />
      <span style={{ fontSize: 12, color: noMatches ? '#b91c1c' : '#6b7280', minWidth: 48, textAlign: 'center' }}>
        {noMatches ? t.tlNoMatches : totalMatches > 0 ? t.tlMatchOf(currentIndex + 1, totalMatches) : ''}
      </span>
      <button aria-label={t.tlPrevMatch} style={iconBtn} disabled={totalMatches === 0} onClick={onPrev}>▲</button>
      <button aria-label={t.tlNextMatch} style={iconBtn} disabled={totalMatches === 0} onClick={onNext}>▼</button>
      <button aria-label={t.tlCloseSearch} style={iconBtn} onClick={onClose}>✕</button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/searchBar.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/components/searchBar.test.tsx
git commit -m "feat: add SearchBar find-in-document UI"
```

---

### Task 12: Integrate into `PageEditModal` — text layer, popup, markup, search, extract

**Files:**
- Modify: `src/components/PageEditModal.tsx` (mount text layer + MarkupLayer + SelectionPopup + SearchBar; snapshot/restore markup; extract-text button; Ctrl+F)
- Test: `src/components/textLayerIntegration.test.tsx` (integration with mocked text-service)
- Test (manual/Playwright): documented at the end of this task

**Interfaces:**
- Consumes: `renderTextLayer`, `searchDocument`, `extractDocumentText` (Tasks 5–6); `useMarkupStore` (Task 1); `clientRectsToPct` (Task 7); `downloadText` (Task 4); `MarkupLayer`, `SelectionPopup`, `SearchBar` (Tasks 9–11); `useI18n` (Task 8).
- Produces: no new exports — this wires everything into the existing preview.

This is the largest task. Implement it in small steps, testing after each.

- [ ] **Step 1: Write the failing integration test**

```tsx
// src/components/textLayerIntegration.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PageEditModal from './PageEditModal'
import { I18nProvider } from '../services/i18n'
import { useMarkupStore } from '../services/markup-store'

// Mock render-service (canvas) and text-service (layer/search/extract) so no pdf.js loads.
vi.mock('../services/render-service', () => ({
  renderPageToCanvas: () => ({ cancel() {}, done: Promise.resolve() }),
}))
const extractSpy = vi.fn().mockResolvedValue('page one text\n\npage two text')
vi.mock('../services/text-service', () => ({
  renderTextLayer: () => ({ cancel() {}, done: Promise.resolve() }),
  searchDocument: vi.fn().mockResolvedValue([{ pageIndex: 0, itemIndex: 0, start: 0, length: 3 }]),
  extractDocumentText: (...a: unknown[]) => extractSpy(...a),
}))
const downloadTextSpy = vi.fn()
vi.mock('../services/file-io', () => ({ downloadText: (...a: unknown[]) => downloadTextSpy(...a) }))

const fakeDoc = { numPages: 2, getPage: async () => ({ getViewport: () => ({ width: 300, height: 400 }) }) }

function renderModal() {
  const noop = () => {}
  return render(
    <I18nProvider>
      <PageEditModal
        page={0} pageCount={2} doc={fakeDoc as never} zoom={1}
        onZoom={noop} onGo={noop} onClose={noop} onAddText={noop} onAddPicture={noop}
        onSign={noop} onApply={noop} onUndo={noop} onRedo={noop} canUndo={false} canRedo={false}
        onInsert={noop} onDeletePage={noop} onDuplicate={noop} onRotateL={noop} onRotateR={noop}
        onMoveBefore={noop} onMoveAfter={noop}
      />
    </I18nProvider>,
  )
}

describe('PageEditModal — text layer integration', () => {
  beforeEach(() => { useMarkupStore.setState({ objects: [] }); extractSpy.mockClear(); downloadTextSpy.mockClear() })

  it('renders a text layer container and a markup layer', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByTestId('text-layer')).toBeTruthy())
    expect(screen.getByTestId('markup-layer')).toBeTruthy()
  })

  it('Extract text downloads a .txt of the whole document', async () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Extract text'))
    await waitFor(() => expect(downloadTextSpy).toHaveBeenCalledOnce())
    expect(downloadTextSpy.mock.calls[0][0]).toContain('page one text')
    expect(downloadTextSpy.mock.calls[0][1]).toMatch(/\.txt$/)
  })

  it('opening search shows the search bar', async () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Search'))
    expect(screen.getByTestId('search-bar')).toBeTruthy()
  })

  it('cancelling restores the markup snapshot taken on mount', async () => {
    // markup added after mount is discarded on Cancel (mirrors overlay behavior)
    renderModal()
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', [{ xPct: 0.1, yPct: 0.1, wPct: 0.2, hPct: 0.02 }])
    fireEvent.click(screen.getByLabelText('Cancel'))
    expect(useMarkupStore.getState().objects).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/textLayerIntegration.test.tsx`
Expected: FAIL — no `text-layer` testid, no `Extract text`/`Search` buttons, markup not restored on cancel.

- [ ] **Step 3: Add imports and markup snapshot/restore to `PageEditModal.tsx`**

Add imports at the top (after existing imports):

```tsx
import MarkupLayer from './MarkupLayer'
import SelectionPopup from './SelectionPopup'
import SearchBar from './SearchBar'
import { renderTextLayer, searchDocument, extractDocumentText } from '../services/text-service'
import type { SearchHit } from '../services/text-service'
import { useMarkupStore } from '../services/markup-store'
import type { MarkupObject, MarkupType } from '../services/markup-store'
import { clientRectsToPct } from '../services/selection-util'
import { downloadText } from '../services/file-io'
```

Extend the mount-snapshot effect and cancel/restore handlers so markup is snapshotted alongside overlays. Replace the existing `mountSnapshot`/`handleCancel`/`handleRestore` block (lines ~156–169) with:

```tsx
  const mountSnapshot = useRef<OverlayObject[]>([])
  const markupSnapshot = useRef<MarkupObject[]>([])
  useEffect(() => {
    mountSnapshot.current = useOverlayStore.getState().objects
    markupSnapshot.current = useMarkupStore.getState().objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCancel = useCallback(() => {
    useOverlayStore.setState({ objects: mountSnapshot.current })
    useMarkupStore.setState({ objects: markupSnapshot.current })
    onClose()
  }, [onClose])

  const handleRestore = useCallback(() => {
    useOverlayStore.setState({ objects: mountSnapshot.current })
    useMarkupStore.setState({ objects: markupSnapshot.current })
  }, [])
```

- [ ] **Step 4: Add the text layer, markup layer, selection popup, and search state**

Add this state + effects inside the component body (after the `canvasSize` effect):

```tsx
  // ── Text layer: build pdf.js selectable spans over the canvas ──────────────
  const textLayerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = textLayerRef.current
    if (!el) return
    const pending = (doc as { getPage?: (n: number) => Promise<never> })?.getPage?.(currentPage)
    if (!pending || typeof (pending as { then?: unknown }).then !== 'function') return
    let handle: { cancel(): void } | null = null
    ;(pending as Promise<never>).then((p) => {
      handle = renderTextLayer(p, zoom, el)
    }).catch(() => {})
    return () => handle?.cancel()
  }, [doc, currentPage, zoom])

  // ── Selection popup ────────────────────────────────────────────────────────
  const [popup, setPopup] = useState<{ x: number; y: number; text: string } | null>(null)
  const handleSelection = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString() ?? ''
    if (!sel || sel.isCollapsed || !text.trim() || !textLayerRef.current) {
      setPopup(null)
      return
    }
    // Only react to selections inside our text layer.
    if (!textLayerRef.current.contains(sel.anchorNode)) return
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setPopup({ x: rect.left + rect.width / 2, y: rect.top - 6, text })
  }, [])
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [handleSelection])

  const addMarkupFromSelection = useCallback((type: MarkupType, color: string) => {
    const sel = window.getSelection()
    const wrap = canvasWrapRef.current
    if (!sel || sel.isCollapsed || !wrap) return
    const wrapBox = wrap.getBoundingClientRect()
    const clientRects = Array.from(sel.getRangeAt(0).getClientRects())
    const rects = clientRectsToPct(clientRects, wrapBox)
    if (rects.length) useMarkupStore.getState().addMarkup(page, type, color, rects)
    sel.removeAllRanges()
    setPopup(null)
  }, [page])

  const copySelection = useCallback(() => {
    const text = window.getSelection()?.toString() ?? ''
    if (text) navigator.clipboard?.writeText(text).catch(() => {})
    setPopup(null)
  }, [])

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [hitIndex, setHitIndex] = useState(-1)
  useEffect(() => {
    if (!searchOpen || !query) { setHits([]); setHitIndex(-1); return }
    let active = true
    searchDocument(doc as never, query).then((h) => {
      if (!active) return
      setHits(h)
      setHitIndex(h.length ? 0 : -1)
      if (h.length) onGo(h[0].pageIndex + 1)
    }).catch(() => {})
    return () => { active = false }
  }, [searchOpen, query, doc, onGo])

  const gotoHit = useCallback((next: number) => {
    if (!hits.length) return
    const i = (next + hits.length) % hits.length
    setHitIndex(i)
    onGo(hits[i].pageIndex + 1)
  }, [hits, onGo])

  // Ctrl+F opens search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ── Extract text ─────────────────────────────────────────────────────────
  const handleExtract = useCallback(async () => {
    const text = await extractDocumentText(doc as never)
    downloadText(text, 'extracted-text.txt')
  }, [doc])
```

- [ ] **Step 5: Mount the layers and toolbar buttons in the JSX**

Inside the `canvasWrapRef` div, add the text layer + markup layer right after `<PageCanvas .../>` and before/around `<OverlayLayer .../>`:

```tsx
            <PageCanvas doc={doc} pageNumber={currentPage} scale={zoom} />
            <div ref={textLayerRef} data-testid="text-layer" style={{ position: 'absolute', inset: 0 }} />
            {canvasSize.width > 0 && canvasSize.height > 0 && (
              <>
                <MarkupLayer page={page} />
                <OverlayLayer page={page} pageWidthPx={canvasSize.width} pageHeightPx={canvasSize.height} />
              </>
            )}
```

Add the `Search` and `Extract text` toolbar buttons in the center toolbar group, after the `emSign` ToolBtn (~line 406):

```tsx
          <ToolBtn label={t.tlSearch} icon={<span style={{ fontSize: 16 }}>🔍</span>} onClick={() => setSearchOpen(true)} />
          <ToolBtn label={t.tlExtractText} icon={<span style={{ fontSize: 16 }}>📄</span>} onClick={handleExtract} />
```

Add the SearchBar to the canvas-area container (the `<div>` with the prev/next arrows, after the "Next page arrow" button), so it overlays the page:

```tsx
        {searchOpen && (
          <SearchBar
            query={query}
            totalMatches={hits.length}
            currentIndex={hitIndex}
            onQueryChange={setQuery}
            onPrev={() => gotoHit(hitIndex - 1)}
            onNext={() => gotoHit(hitIndex + 1)}
            onClose={() => { setSearchOpen(false); setQuery('') }}
          />
        )}
```

Add the SelectionPopup at the end of the modal backdrop (just before the closing `</div>` of the outermost container):

```tsx
      <SelectionPopup
        pos={popup ? { x: popup.x, y: popup.y } : null}
        selectedText={popup?.text ?? ''}
        onCopy={copySelection}
        onMark={addMarkupFromSelection}
        onSearch={() => { if (popup) { setQuery(popup.text); setSearchOpen(true); setPopup(null) } }}
        onDismiss={() => setPopup(null)}
      />
```

- [ ] **Step 6: Run the integration test and the full suite**

Run: `npx vitest run src/components/textLayerIntegration.test.tsx` → PASS.
Run: `npm test` → all green (previous 123 + new tests).
Run: `npm run build` → clean.
Run: `npm run lint` → clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/PageEditModal.tsx src/components/textLayerIntegration.test.tsx
git commit -m "feat: wire text selection, markup, search, and extract into the preview"
```

- [ ] **Step 8: Manual / Playwright verification (the spec's alignment risk)**

Run `npm run dev`, open a **text** PDF (not a scan), and confirm in a real browser:
1. Dragging across text shows a **grey** selection and the **popup** appears above it.
2. **Copy** puts the exact text on the clipboard — test an English page **and** a 中文 page (paste into a text editor; characters must be correct, not garbled).
3. **Highlight** (and a swatch) leaves a colored mark that stays put when you zoom in/out and change pages.
4. **Underline/Strikethrough** land on the right line.
5. **Export/Download** the PDF and reopen it — the markup is baked in at the right positions on 0° and rotated pages.
6. **Ctrl+F** finds matches, the count is right, next/prev jumps pages.
7. **Extract text** downloads a `.txt` containing the document's text in all its languages.

If highlights are misaligned at non-100% zoom, the fix is in `renderTextLayer` geometry (viewport scale / `--scale-factor` / wrapper sizing) — not in the components.

---

## Self-Review

**Spec coverage:**
- Select + native grey highlight → Task 6 (`renderTextLayer` + `.textLayer ::selection` grey) + Task 12 wiring. ✅
- Floating popup (Copy/Highlight/Underline/Strikethrough/Search) → Task 10 + Task 12. ✅
- Highlight button + swatch row, default yellow → Task 10 (`SWATCHES`, Highlight = `#ffd54a`). ✅
- Persistent markup, exported into PDF → Tasks 1, 2, 3. ✅
- Ctrl+F find with count/next/prev → Tasks 5, 11, 12. ✅
- Extract text (copy + `.txt`) → copy via popup Copy (Task 10/12); `.txt` via Tasks 4, 5, 12. ✅
- Multilingual (Latin + 中文) → Task 5 unicode tests; Task 12 manual/Playwright CJK copy check. ✅
- Golden rule (UI calls services) → all pdf.js/pdf-lib use is in services. ✅
- Markup mirrors overlays (separate state, flatten at export, snapshot/restore, not in undo stack) → Tasks 1, 3, 12. ✅
- Alignment risk isolated + Playwright-verified → Task 6 note + Task 12 Step 8. ✅

**Placeholder scan:** No TBD/TODO; every code step has complete code.

**Type consistency:** `RectPct`, `MarkupObject`, `MarkupType` defined in Task 1 and imported everywhere. `flattenObjects(bytes, objects, markup?)` signature used consistently (Task 3 def + App.tsx call). `SearchHit` defined in Task 5, consumed in Task 12. `renderTextLayer(page, scale, container)` def (Task 6) matches call (Task 12). `clientRectsToPct(rects, wrapper)` def (Task 7) matches call (Task 12). Component prop shapes match their tests and their Task 12 usage.

**Known v1 simplifications (acceptable, noted):**
- Search highlighting jumps to the matching page but does not draw per-glyph match boxes on the canvas in this phase (the count + page navigation are the deliverable). Drawing exact in-page match rectangles can build on `textDivs` in a follow-up.
- Underline/strikethrough bars use a fixed thickness derived from rect height.

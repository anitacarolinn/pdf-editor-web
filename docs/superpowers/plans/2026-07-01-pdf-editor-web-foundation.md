# PDF Editor — Web Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, web-based PDF page editor (open a PDF, view page thumbnails, reorder/rotate/delete/insert/merge/split/extract pages, download the result) as the foundation for all later features.

**Architecture:** A React + Vite + TypeScript single-page app. All PDF logic lives in framework-free "core service" modules that the UI calls; the UI never imports pdf-lib/pdf.js directly. Page operations are **pure async functions** over `Uint8Array` (bytes in → bytes out), which makes them trivially testable without a browser. A small Zustand store holds the working document and an undo/redo history.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS v4, Zustand 5, pdf-lib (structure edits), pdfjs-dist (rendering), Vitest + @testing-library/react (tests).

## Global Constraints

- Node.js 18+ required (Vite 5 / Vitest baseline).
- **The UI layer must never import `pdf-lib` or `pdfjs-dist` directly** — only `src/services/*` may. This guarantees the same services power the future Tauri desktop build.
- **Non-destructive:** every page operation returns *new* bytes; it never mutates the input `Uint8Array`.
- All page operations are `async` and return `Promise<Uint8Array>` (except `splitPdf` → `Promise<Uint8Array[]>` and read helpers).
- Page indices are **0-based** throughout the codebase.
- Package manager: `npm`. All commit messages use Conventional Commits (`feat:`, `test:`, `chore:`).

---

### Task 1: Project scaffold & test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src/test/fixtures.ts` (shared PDF test helpers)
- Create: `src/test/fixtures.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: test helpers used by every later task —
  - `makeSamplePdf(pageCount: number): Promise<Uint8Array>` — builds a PDF where page `i` has width `(i+1)*100` and height `200`, so pages are identifiable by width.
  - `getPageWidths(bytes: Uint8Array): Promise<number[]>` — returns each page's rounded width in order.
  - `getPageCount(bytes: Uint8Array): Promise<number>`.

- [ ] **Step 1: Scaffold the Vite React-TS project**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install pdf-lib pdfjs-dist zustand
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @tailwindcss/vite tailwindcss
```

- [ ] **Step 2: Configure Vite for Tailwind v4 and Vitest**

Replace `vite.config.ts` with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

Add test scripts to `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write the failing fixtures test**

Create `src/test/fixtures.ts`:
```ts
export async function makeSamplePdf(pageCount: number): Promise<Uint8Array> {
  throw new Error('not implemented')
}
export async function getPageWidths(bytes: Uint8Array): Promise<number[]> {
  throw new Error('not implemented')
}
export async function getPageCount(bytes: Uint8Array): Promise<number> {
  throw new Error('not implemented')
}
```

Create `src/test/fixtures.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { makeSamplePdf, getPageWidths, getPageCount } from './fixtures'

describe('test fixtures', () => {
  it('builds a pdf with identifiable page widths', async () => {
    const bytes = await makeSamplePdf(3)
    expect(await getPageCount(bytes)).toBe(3)
    expect(await getPageWidths(bytes)).toEqual([100, 200, 300])
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- fixtures`
Expected: FAIL with "not implemented".

- [ ] **Step 5: Implement the fixtures**

Replace `src/test/fixtures.ts`:
```ts
import { PDFDocument } from 'pdf-lib'

export async function makeSamplePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([(i + 1) * 100, 200])
  }
  return doc.save()
}

export async function getPageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => Math.round(p.getWidth()))
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- fixtures`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold vite react-ts app with tailwind and test harness"
```

---

### Task 2: page-ops — load & read page count

**Files:**
- Create: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Consumes: `makeSamplePdf`, `getPageWidths` from `src/test/fixtures.ts`.
- Produces: `getPageCount(bytes: Uint8Array): Promise<number>` (the app's own copy, so services don't depend on test code).

- [ ] **Step 1: Write the failing test**

Create `src/services/page-ops.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { makeSamplePdf } from '../test/fixtures'
import { getPageCount } from './page-ops'

describe('getPageCount', () => {
  it('returns the number of pages', async () => {
    const bytes = await makeSamplePdf(4)
    expect(await getPageCount(bytes)).toBe(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `getPageCount` is not exported.

- [ ] **Step 3: Implement**

Create `src/services/page-ops.ts`:
```ts
import { PDFDocument } from 'pdf-lib'

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add getPageCount page operation"
```

---

### Task 3: page-ops — rotatePage

**Files:**
- Modify: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `rotatePage(bytes: Uint8Array, pageIndex: number, degrees: number): Promise<Uint8Array>` — adds `degrees` (normalized to a multiple of 90) to the page's existing rotation. Returns new bytes; does not mutate input.

- [ ] **Step 1: Write the failing test**

Add to `src/services/page-ops.test.ts`:
```ts
import { rotatePage } from './page-ops'
import { PDFDocument } from 'pdf-lib'

describe('rotatePage', () => {
  it('adds 90 degrees to the target page only', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await rotatePage(bytes, 1, 90)
    const doc = await PDFDocument.load(out)
    expect(doc.getPage(1).getRotation().angle).toBe(90)
    expect(doc.getPage(0).getRotation().angle).toBe(0)
  })

  it('does not mutate the input bytes', async () => {
    const bytes = await makeSamplePdf(1)
    const copy = bytes.slice()
    await rotatePage(bytes, 0, 90)
    expect(bytes).toEqual(copy)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `rotatePage` not exported.

- [ ] **Step 3: Implement**

Add to `src/services/page-ops.ts`:
```ts
import { PDFDocument, degrees as pdfDegrees } from 'pdf-lib'

export async function rotatePage(
  bytes: Uint8Array,
  pageIndex: number,
  degrees: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const page = doc.getPage(pageIndex)
  const current = page.getRotation().angle
  const next = (((current + degrees) % 360) + 360) % 360
  page.setRotation(pdfDegrees(next))
  return doc.save()
}
```
(Update the existing `import { PDFDocument } from 'pdf-lib'` line to the combined import above.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add rotatePage page operation"
```

---

### Task 4: page-ops — deletePages

**Files:**
- Modify: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `deletePages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array>` — removes the given 0-based page indices, preserving the order of the survivors.

- [ ] **Step 1: Write the failing test**

Add to `src/services/page-ops.test.ts`:
```ts
import { deletePages } from './page-ops'
import { getPageWidths } from '../test/fixtures'

describe('deletePages', () => {
  it('removes the given pages and keeps survivor order', async () => {
    const bytes = await makeSamplePdf(4) // widths 100,200,300,400
    const out = await deletePages(bytes, [1, 3])
    expect(await getPageWidths(out)).toEqual([100, 300])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `deletePages` not exported.

- [ ] **Step 3: Implement**

Add to `src/services/page-ops.ts`:
```ts
export async function deletePages(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  // remove from highest index down so earlier indices stay valid
  const sorted = [...new Set(indices)].sort((a, b) => b - a)
  for (const i of sorted) doc.removePage(i)
  return doc.save()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add deletePages page operation"
```

---

### Task 5: page-ops — reorderPages

**Files:**
- Modify: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `reorderPages(bytes: Uint8Array, newOrder: number[]): Promise<Uint8Array>` — `newOrder` is a permutation of `[0..n-1]`; result page `k` is the original page `newOrder[k]`.

- [ ] **Step 1: Write the failing test**

Add to `src/services/page-ops.test.ts`:
```ts
import { reorderPages } from './page-ops'

describe('reorderPages', () => {
  it('reorders pages per the permutation', async () => {
    const bytes = await makeSamplePdf(3) // widths 100,200,300
    const out = await reorderPages(bytes, [2, 0, 1])
    expect(await getPageWidths(out)).toEqual([300, 100, 200])
  })

  it('throws if newOrder is not a permutation of all pages', async () => {
    const bytes = await makeSamplePdf(3)
    await expect(reorderPages(bytes, [0, 1])).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `reorderPages` not exported.

- [ ] **Step 3: Implement**

Add to `src/services/page-ops.ts`:
```ts
export async function reorderPages(
  bytes: Uint8Array,
  newOrder: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes)
  const count = src.getPageCount()
  const valid =
    newOrder.length === count &&
    new Set(newOrder).size === count &&
    newOrder.every((i) => i >= 0 && i < count)
  if (!valid) throw new Error('newOrder must be a permutation of all page indices')

  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, newOrder)
  copied.forEach((p) => out.addPage(p))
  return out.save()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add reorderPages page operation"
```

---

### Task 6: page-ops — insertBlankPage

**Files:**
- Modify: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `insertBlankPage(bytes: Uint8Array, atIndex: number, size?: [number, number]): Promise<Uint8Array>` — inserts a blank page at `atIndex` (0-based; `atIndex === pageCount` appends). Default size `[595, 842]` (A4 points).

- [ ] **Step 1: Write the failing test**

Add to `src/services/page-ops.test.ts`:
```ts
import { insertBlankPage } from './page-ops'

describe('insertBlankPage', () => {
  it('inserts a blank page at the given index', async () => {
    const bytes = await makeSamplePdf(2) // widths 100,200
    const out = await insertBlankPage(bytes, 1, [150, 200])
    expect(await getPageWidths(out)).toEqual([100, 150, 200])
  })

  it('appends when atIndex equals page count', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await insertBlankPage(bytes, 2, [150, 200])
    expect(await getPageWidths(out)).toEqual([100, 200, 150])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `insertBlankPage` not exported.

- [ ] **Step 3: Implement**

Add to `src/services/page-ops.ts`:
```ts
export async function insertBlankPage(
  bytes: Uint8Array,
  atIndex: number,
  size: [number, number] = [595, 842],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  doc.insertPage(atIndex, size)
  return doc.save()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add insertBlankPage page operation"
```

---

### Task 7: page-ops — extractPages

**Files:**
- Modify: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array>` — returns a new PDF containing only the given pages, in the order listed.

- [ ] **Step 1: Write the failing test**

Add to `src/services/page-ops.test.ts`:
```ts
import { extractPages } from './page-ops'

describe('extractPages', () => {
  it('returns only the requested pages in order', async () => {
    const bytes = await makeSamplePdf(4) // 100,200,300,400
    const out = await extractPages(bytes, [3, 1])
    expect(await getPageWidths(out)).toEqual([400, 200])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `extractPages` not exported.

- [ ] **Step 3: Implement**

Add to `src/services/page-ops.ts`:
```ts
export async function extractPages(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, indices)
  copied.forEach((p) => out.addPage(p))
  return out.save()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add extractPages page operation"
```

---

### Task 8: page-ops — mergePdfs

**Files:**
- Modify: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `mergePdfs(docs: Uint8Array[]): Promise<Uint8Array>` — concatenates all pages of all input PDFs in array order.

- [ ] **Step 1: Write the failing test**

Add to `src/services/page-ops.test.ts`:
```ts
import { mergePdfs } from './page-ops'

describe('mergePdfs', () => {
  it('concatenates pages of all inputs in order', async () => {
    const a = await makeSamplePdf(2) // 100,200
    const b = await makeSamplePdf(1) // 100
    const out = await mergePdfs([a, b])
    expect(await getPageWidths(out)).toEqual([100, 200, 100])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `mergePdfs` not exported.

- [ ] **Step 3: Implement**

Add to `src/services/page-ops.ts`:
```ts
export async function mergePdfs(docs: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (const bytes of docs) {
    const src = await PDFDocument.load(bytes)
    const copied = await out.copyPages(src, src.getPageIndices())
    copied.forEach((p) => out.addPage(p))
  }
  return out.save()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add mergePdfs page operation"
```

---

### Task 9: page-ops — splitPdf

**Files:**
- Modify: `src/services/page-ops.ts`
- Test: `src/services/page-ops.test.ts`

**Interfaces:**
- Produces: `splitPdf(bytes: Uint8Array, ranges: number[][]): Promise<Uint8Array[]>` — each inner array is a list of 0-based page indices; returns one PDF per range.

- [ ] **Step 1: Write the failing test**

Add to `src/services/page-ops.test.ts`:
```ts
import { splitPdf } from './page-ops'

describe('splitPdf', () => {
  it('produces one pdf per range with the right pages', async () => {
    const bytes = await makeSamplePdf(4) // 100,200,300,400
    const parts = await splitPdf(bytes, [[0, 1], [2, 3]])
    expect(parts).toHaveLength(2)
    expect(await getPageWidths(parts[0])).toEqual([100, 200])
    expect(await getPageWidths(parts[1])).toEqual([300, 400])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- page-ops`
Expected: FAIL — `splitPdf` not exported.

- [ ] **Step 3: Implement**

Add to `src/services/page-ops.ts`:
```ts
export async function splitPdf(
  bytes: Uint8Array,
  ranges: number[][],
): Promise<Uint8Array[]> {
  const results: Uint8Array[] = []
  for (const range of ranges) {
    results.push(await extractPages(bytes, range))
  }
  return results
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- page-ops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/page-ops.ts src/services/page-ops.test.ts
git commit -m "feat: add splitPdf page operation"
```

---

### Task 10: document-store (state + undo/redo)

**Files:**
- Create: `src/services/document-store.ts`
- Test: `src/services/document-store.test.ts`

**Interfaces:**
- Consumes: nothing from other services (holds bytes only).
- Produces a Zustand store `useDocumentStore` with state/actions:
  - state: `bytes: Uint8Array | null`, `fileName: string | null`, `past: Uint8Array[]`, `future: Uint8Array[]`
  - `load(bytes: Uint8Array, fileName: string): void` — sets bytes, clears history.
  - `apply(op: (b: Uint8Array) => Promise<Uint8Array>): Promise<void>` — pushes current bytes to `past`, runs `op`, sets result, clears `future`. No-op if `bytes` is null.
  - `undo(): void`, `redo(): void`, `canUndo(): boolean`, `canRedo(): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/services/document-store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from './document-store'

const A = new Uint8Array([1])
const B = new Uint8Array([2])

beforeEach(() => {
  useDocumentStore.getState().load(A, 'a.pdf')
})

describe('document-store', () => {
  it('loads bytes and file name', () => {
    const s = useDocumentStore.getState()
    expect(s.bytes).toEqual(A)
    expect(s.fileName).toBe('a.pdf')
    expect(s.canUndo()).toBe(false)
  })

  it('apply runs the op and enables undo', async () => {
    await useDocumentStore.getState().apply(async () => B)
    const s = useDocumentStore.getState()
    expect(s.bytes).toEqual(B)
    expect(s.canUndo()).toBe(true)
  })

  it('undo restores previous bytes and enables redo', async () => {
    await useDocumentStore.getState().apply(async () => B)
    useDocumentStore.getState().undo()
    const s = useDocumentStore.getState()
    expect(s.bytes).toEqual(A)
    expect(s.canRedo()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- document-store`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/services/document-store.ts`:
```ts
import { create } from 'zustand'

interface DocState {
  bytes: Uint8Array | null
  fileName: string | null
  past: Uint8Array[]
  future: Uint8Array[]
  load: (bytes: Uint8Array, fileName: string) => void
  apply: (op: (b: Uint8Array) => Promise<Uint8Array>) => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useDocumentStore = create<DocState>((set, get) => ({
  bytes: null,
  fileName: null,
  past: [],
  future: [],
  load: (bytes, fileName) => set({ bytes, fileName, past: [], future: [] }),
  apply: async (op) => {
    const current = get().bytes
    if (!current) return
    const next = await op(current)
    set((s) => ({ bytes: next, past: [...s.past, current], future: [] }))
  },
  undo: () =>
    set((s) => {
      if (s.past.length === 0 || !s.bytes) return s
      const prev = s.past[s.past.length - 1]
      return {
        bytes: prev,
        past: s.past.slice(0, -1),
        future: [s.bytes, ...s.future],
      }
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0 || !s.bytes) return s
      const next = s.future[0]
      return {
        bytes: next,
        past: [...s.past, s.bytes],
        future: s.future.slice(1),
      }
    }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- document-store`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/document-store.ts src/services/document-store.test.ts
git commit -m "feat: add document store with undo/redo"
```

---

### Task 11: render-service (pdf.js wrapper)

**Files:**
- Create: `src/services/render-service.ts`
- Test: `src/services/render-service.test.ts`

**Interfaces:**
- Produces:
  - `loadRenderDoc(bytes: Uint8Array): Promise<PDFDocumentProxy>` — opens the PDF with pdf.js.
  - `renderPageToCanvas(doc: PDFDocumentProxy, pageNumber: number, canvas: HTMLCanvasElement, scale: number): Promise<void>` — pageNumber is **1-based** (pdf.js convention).
  - `scaleForWidth(viewportWidth: number, targetWidth: number): number` — pure helper returning `targetWidth / viewportWidth`.

**Note:** Rasterization (`renderPageToCanvas`) requires a real canvas and is verified manually in the browser at Task 14. The unit test covers only the pure helper to avoid canvas polyfills in jsdom.

- [ ] **Step 1: Write the failing test**

Create `src/services/render-service.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { scaleForWidth } from './render-service'

describe('scaleForWidth', () => {
  it('computes the scale factor to hit a target width', () => {
    expect(scaleForWidth(200, 100)).toBe(0.5)
    expect(scaleForWidth(100, 300)).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- render-service`
Expected: FAIL — `scaleForWidth` not exported.

- [ ] **Step 3: Implement**

Create `src/services/render-service.ts`:
```ts
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export function scaleForWidth(viewportWidth: number, targetWidth: number): number {
  return targetWidth / viewportWidth
}

export async function loadRenderDoc(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  // pdf.js transfers/detaches the buffer; pass a copy so the store's bytes stay intact
  return pdfjs.getDocument({ data: bytes.slice() }).promise
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<void> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: ctx, viewport }).promise
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- render-service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/render-service.ts src/services/render-service.test.ts
git commit -m "feat: add pdf.js render service"
```

---

### Task 12: export-service (download)

**Files:**
- Create: `src/services/export-service.ts`
- Test: `src/services/export-service.test.ts`

**Interfaces:**
- Produces: `downloadBytes(bytes: Uint8Array, fileName: string): void` — triggers a browser download of the bytes as `application/pdf`.

- [ ] **Step 1: Write the failing test**

Create `src/services/export-service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadBytes } from './export-service'

describe('downloadBytes', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('creates an object url and clicks an anchor with the file name', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadBytes(new Uint8Array([1, 2, 3]), 'out.pdf')
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    clickSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- export-service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/services/export-service.ts`:
```ts
export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- export-service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/export-service.ts src/services/export-service.test.ts
git commit -m "feat: add export/download service"
```

---

### Task 13: UI shell layout

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/Toolbar.tsx`, `src/components/ThumbnailRail.tsx`, `src/components/Viewer.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useDocumentStore` from Task 10.
- Produces: an `<App>` rendering a top `Toolbar`, left `ThumbnailRail`, center `Viewer`. When no document is loaded, shows an empty-state prompt with text "Open a PDF to get started".

- [ ] **Step 1: Write the failing test**

Create `src/App.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useDocumentStore } from './services/document-store'

beforeEach(() => {
  useDocumentStore.setState({ bytes: null, fileName: null, past: [], future: [] })
})

describe('App shell', () => {
  it('shows an empty state when no document is loaded', () => {
    render(<App />)
    expect(screen.getByText('Open a PDF to get started')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- App`
Expected: FAIL — empty-state text absent.

- [ ] **Step 3: Implement the components**

Create `src/components/Toolbar.tsx`:
```tsx
export default function Toolbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-800">PDF Editor</span>
      <div className="ml-4 flex items-center gap-2">{children}</div>
    </header>
  )
}
```

Create `src/components/ThumbnailRail.tsx`:
```tsx
export default function ThumbnailRail({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="w-48 shrink-0 overflow-y-auto border-r bg-slate-50 p-2">
      {children}
    </aside>
  )
}
```

Create `src/components/Viewer.tsx`:
```tsx
export default function Viewer({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-auto bg-slate-200 p-6">{children}</main>
  )
}
```

Replace `src/App.tsx`:
```tsx
import Toolbar from './components/Toolbar'
import ThumbnailRail from './components/ThumbnailRail'
import Viewer from './components/Viewer'
import { useDocumentStore } from './services/document-store'

export default function App() {
  const bytes = useDocumentStore((s) => s.bytes)
  return (
    <div className="flex h-screen flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <ThumbnailRail />
        <Viewer>
          {!bytes && (
            <div className="grid h-full place-items-center text-slate-500">
              Open a PDF to get started
            </div>
          )}
        </Viewer>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- App`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components src/App.test.tsx
git commit -m "feat: add app shell layout"
```

---

### Task 14: Open a file & render pages

**Files:**
- Modify: `src/components/Toolbar.tsx` (add Open button + hidden file input)
- Modify: `src/components/ThumbnailRail.tsx` (render one canvas per page)
- Modify: `src/components/Viewer.tsx` (render the selected page large)
- Create: `src/components/PageCanvas.tsx`
- Modify: `src/App.tsx` (wire open handler, selected page state)
- Test: `src/components/openFlow.test.tsx`

**Interfaces:**
- Consumes: `useDocumentStore.load`, `getPageCount` (page-ops), `loadRenderDoc`/`renderPageToCanvas` (render-service).
- Produces: `readFileAsBytes(file: File): Promise<Uint8Array>` helper in `src/services/file-io.ts`, and a working open→display flow.

- [ ] **Step 1: Write the failing test (file-io helper)**

Create `src/services/file-io.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { readFileAsBytes } from './file-io'

describe('readFileAsBytes', () => {
  it('reads a File into a Uint8Array', async () => {
    const file = new File([new Uint8Array([9, 8, 7])], 'x.pdf', { type: 'application/pdf' })
    expect(await readFileAsBytes(file)).toEqual(new Uint8Array([9, 8, 7]))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- file-io`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `src/services/file-io.ts`:
```ts
export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer()
  return new Uint8Array(buf)
}
```

- [ ] **Step 4: Run helper test**

Run: `npm test -- file-io`
Expected: PASS.

- [ ] **Step 5: Implement PageCanvas and wire the open flow**

Create `src/components/PageCanvas.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageToCanvas } from '../services/render-service'

export default function PageCanvas({
  doc,
  pageNumber,
  scale,
  className,
  onClick,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  scale: number
  className?: string
  onClick?: () => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let cancelled = false
    if (ref.current) {
      renderPageToCanvas(doc, pageNumber, ref.current, scale).catch(() => {})
    }
    return () => {
      cancelled = true
      void cancelled
    }
  }, [doc, pageNumber, scale])
  return <canvas ref={ref} className={className} onClick={onClick} />
}
```

Replace `src/App.tsx` with the wired version:
```tsx
import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Toolbar from './components/Toolbar'
import ThumbnailRail from './components/ThumbnailRail'
import Viewer from './components/Viewer'
import PageCanvas from './components/PageCanvas'
import { useDocumentStore } from './services/document-store'
import { readFileAsBytes } from './services/file-io'
import { loadRenderDoc } from './services/render-service'
import { getPageCount } from './services/page-ops'

export default function App() {
  const { bytes, load } = useDocumentStore()
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selected, setSelected] = useState(1)

  useEffect(() => {
    if (!bytes) {
      setDoc(null)
      setPageCount(0)
      return
    }
    let active = true
    ;(async () => {
      const [rdoc, count] = await Promise.all([loadRenderDoc(bytes), getPageCount(bytes)])
      if (!active) return
      setDoc(rdoc)
      setPageCount(count)
      setSelected((s) => Math.min(s, count) || 1)
    })()
    return () => {
      active = false
    }
  }, [bytes])

  async function onOpen(file: File) {
    const b = await readFileAsBytes(file)
    load(b, file.name)
    setSelected(1)
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar onOpen={onOpen} />
      <div className="flex flex-1 overflow-hidden">
        <ThumbnailRail>
          {doc &&
            Array.from({ length: pageCount }, (_, i) => (
              <PageCanvas
                key={i}
                doc={doc}
                pageNumber={i + 1}
                scale={0.2}
                className={`mb-2 w-full cursor-pointer border ${
                  selected === i + 1 ? 'border-blue-500' : 'border-transparent'
                }`}
                onClick={() => setSelected(i + 1)}
              />
            ))}
        </ThumbnailRail>
        <Viewer>
          {!bytes && (
            <div className="grid h-full place-items-center text-slate-500">
              Open a PDF to get started
            </div>
          )}
          {doc && (
            <PageCanvas doc={doc} pageNumber={selected} scale={1} className="mx-auto bg-white shadow" />
          )}
        </Viewer>
      </div>
    </div>
  )
}
```

Replace `src/components/Toolbar.tsx` to add the Open button:
```tsx
import { useRef } from 'react'

export default function Toolbar({
  onOpen,
  children,
}: {
  onOpen: (file: File) => void
  children?: React.ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <header className="flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-800">PDF Editor</span>
      <button
        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        onClick={() => inputRef.current?.click()}
      >
        Open PDF
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onOpen(f)
          e.target.value = ''
        }}
      />
      <div className="ml-4 flex items-center gap-2">{children}</div>
    </header>
  )
}
```

Update `ThumbnailRail.tsx` — it already accepts `children`, no change needed if it matches Task 13. Confirm it renders `children`.

- [ ] **Step 6: Write an interaction test for the open flow**

Create `src/components/openFlow.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

// jsdom has no canvas 2d; stub the raster render so wiring can be tested
vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 2 })),
  renderPageToCanvas: vi.fn(async () => {}),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(() => {
  useDocumentStore.setState({ bytes: null, fileName: null, past: [], future: [] })
})

describe('open flow', () => {
  it('loads a chosen file and leaves the empty state', async () => {
    render(<App />)
    const bytes = await makeSamplePdf(2)
    const file = new File([bytes], 'sample.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, file)
    await waitFor(() =>
      expect(screen.queryByText('Open a PDF to get started')).not.toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 8: Manually verify rasterization in the browser**

Run: `npm run dev`, open the URL, click "Open PDF", choose a real multi-page PDF.
Expected: thumbnails appear in the left rail; clicking a thumbnail shows that page large in the center.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: open a pdf and render pages"
```

---

### Task 15: Wire page operations to the toolbar

**Files:**
- Modify: `src/components/Toolbar.tsx` (add operation buttons)
- Modify: `src/App.tsx` (pass selected page + handlers)
- Test: `src/components/operations.test.tsx`

**Interfaces:**
- Consumes: `useDocumentStore.apply/undo/redo/canUndo/canRedo`, all `page-ops` functions.
- Produces: toolbar buttons Rotate, Delete, Insert Blank, Undo, Redo that call the store. (Merge/Split/Extract are exposed but Merge is the representative one tested here.)

- [ ] **Step 1: Write the failing interaction test**

Create `src/components/operations.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf, getPageCount } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 3 })),
  renderPageToCanvas: vi.fn(async () => {}),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(3)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

describe('page operations', () => {
  it('Delete reduces the page count of the working document', async () => {
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Page' }))
    await waitFor(async () => {
      const bytes = useDocumentStore.getState().bytes!
      expect(await getPageCount(bytes)).toBe(2)
    })
  })

  it('Undo restores the page count', async () => {
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Page' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => {
      const bytes = useDocumentStore.getState().bytes!
      expect(await getPageCount(bytes)).toBe(3)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- operations`
Expected: FAIL — buttons not present.

- [ ] **Step 3: Implement — extend Toolbar and App wiring**

Replace `src/components/Toolbar.tsx`:
```tsx
import { useRef } from 'react'

export interface ToolbarProps {
  onOpen: (file: File) => void
  onRotate: () => void
  onDelete: () => void
  onInsert: () => void
  onMerge: (file: File) => void
  onUndo: () => void
  onRedo: () => void
  onDownload: () => void
  canUndo: boolean
  canRedo: boolean
  hasDoc: boolean
}

export default function Toolbar(p: ToolbarProps) {
  const openRef = useRef<HTMLInputElement>(null)
  const mergeRef = useRef<HTMLInputElement>(null)
  const btn = 'rounded px-3 py-1 text-sm disabled:opacity-40'
  return (
    <header className="flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-800">PDF Editor</span>
      <button className={`${btn} bg-blue-600 text-white`} onClick={() => openRef.current?.click()}>
        Open PDF
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onRotate}>
        Rotate
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onDelete}>
        Delete Page
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onInsert}>
        Insert Blank
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={() => mergeRef.current?.click()}>
        Merge PDF
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.canUndo} onClick={p.onUndo}>
        Undo
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.canRedo} onClick={p.onRedo}>
        Redo
      </button>
      <button className={`${btn} bg-green-600 text-white`} disabled={!p.hasDoc} onClick={p.onDownload}>
        Download
      </button>
      <input ref={openRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onOpen(f); e.target.value = '' }} />
      <input ref={mergeRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onMerge(f); e.target.value = '' }} />
    </header>
  )
}
```

Replace the `<Toolbar ... />` usage and handlers in `src/App.tsx`. Add these imports at the top (note: `readFileAsBytes` is already imported from Task 14 — do **not** add it again; add only the two below, and extend the existing `getPageCount` import line from page-ops to also import the operation functions):
```tsx
import { getPageCount, rotatePage, deletePages, insertBlankPage, mergePdfs } from './services/page-ops'
import { downloadBytes } from './services/export-service'
```
Inside `App`, replace the destructure and add handlers:
```tsx
  const { bytes, fileName, load, apply, undo, redo, canUndo, canRedo } = useDocumentStore()
  // ... existing doc/pageCount/selected state and effect unchanged ...

  const onRotate = () => apply((b) => rotatePage(b, selected - 1, 90))
  const onDelete = () => apply((b) => deletePages(b, [selected - 1]))
  const onInsert = () => apply((b) => insertBlankPage(b, selected))
  const onMerge = async (file: File) => {
    const other = await readFileAsBytes(file)
    await apply((b) => mergePdfs([b, other]))
  }
  const onDownload = () => {
    if (bytes) downloadBytes(bytes, fileName ?? 'edited.pdf')
  }
```
Replace the `<Toolbar onOpen={onOpen} />` element with:
```tsx
      <Toolbar
        onOpen={onOpen}
        onRotate={onRotate}
        onDelete={onDelete}
        onInsert={onInsert}
        onMerge={onMerge}
        onUndo={undo}
        onRedo={redo}
        onDownload={onDownload}
        canUndo={canUndo()}
        canRedo={canRedo()}
        hasDoc={!!bytes}
      />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- operations`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire page operations and undo/redo to toolbar"
```

---

### Task 16: Download verification & README

**Files:**
- Modify: `src/App.test.tsx` (add a download-path test)
- Create: `README.md`

**Interfaces:**
- Consumes: everything above. No new production interfaces.

- [ ] **Step 1: Write the failing test**

Add to `src/App.test.tsx`:
```tsx
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { makeSamplePdf } from './test/fixtures'

it('Download triggers export of the working bytes', async () => {
  const spy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = vi.fn()
  const bytes = await makeSamplePdf(1)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Download' }))
  expect(spy).toHaveBeenCalledOnce()
  spy.mockRestore()
})
```
(If Task 13's `App.test.tsx` mocks render-service, keep that mock; otherwise add the same `vi.mock('./services/render-service', ...)` block used in Task 14.)

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `npm test -- App`
Expected: PASS once the Download button from Task 15 exists (this test locks the behavior in).

- [ ] **Step 3: Write the README**

Create `README.md`:
```markdown
# PDF Editor (Web)

A privacy-first, in-browser PDF editor. All page editing happens locally — no file is uploaded.

## Features (foundation)
- Open a PDF and preview pages
- Rotate, delete, insert blank pages
- Merge another PDF, undo/redo
- Download the edited PDF

## Develop
```bash
npm install
npm run dev      # start the app
npm test         # run the test suite
npm run build    # production build (static, host anywhere)
```

## Architecture
UI (React) calls framework-free services in `src/services/`:
- `page-ops` — pure PDF page operations (pdf-lib)
- `render-service` — page rendering (pdf.js)
- `document-store` — working document + undo/redo (zustand)
- `export-service` / `file-io` — download & file reading

The UI never imports pdf-lib/pdf.js directly, so the same services power the future desktop (Tauri) build.
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 5: Build to confirm a shippable artifact**

Run: `npm run build`
Expected: build succeeds; `dist/` produced.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add download test and project README"
```

---

## Roadmap (subsequent plans)

Each builds on this foundation's service architecture and gets its own spec-derived plan:

- **Plan 2 — E-signature:** `signature-service` (draw/type/upload via signature_pad) + placement UI; stamps images with pdf-lib.
- **Plan 3 — Lock/Unlock:** `crypto-service` using qpdf-wasm (password encrypt/decrypt) + security panel.
- **Plan 4 — Annotate & fill:** `annotate-service` (text/highlight/shape/image + form fill).
- **Plan 5 — Conversion:** local converters (image/text/Markdown/HTML→PDF) + `convert-service` client calling the native-LibreOffice HTTP endpoint; plus the conversion service itself (separate subsystem: thin HTTP wrapper around `soffice --headless`).
- **Plan 6 — Desktop wrap:** package the web build in the existing Tauri project; add file associations and a configurable conversion endpoint.
```

# Text & Image Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the user **Add text** and **Add picture** as editable overlay objects on the page preview — move, resize, edit content, delete — then **flatten** them into the PDF on Apply/Download (like the `.exe`).

**Architecture:** Overlay objects are stored per page in **normalized coordinates** (fractions of page width/height) in a Zustand `overlay-store`, so they're correct at any zoom. A pure `overlay-coords` module maps a normalized object rect to PDF points (origin bottom-left). A `flatten` service bakes objects into the PDF via pdf-lib `drawText`/`drawImage`. The UI renders each object with **react-rnd** (drag+resize) over the viewer; Apply flattens through the normal `document-store.apply` (so it's undoable) and clears the overlay.

**Tech Stack:** existing + `react-rnd`.

## Global Constraints
- Node 20+; npm; Conventional Commits.
- UI (src/App.tsx, src/components/*) must NEVER import pdf-lib/pdfjs-dist at runtime (type-only OK). Flatten/coords live in src/services/*.
- Objects return NEW bytes on flatten; never mutate input; all async where they touch pdf-lib; page indices 0-based.
- Coordinate convention: `xPct,yPct` = object TOP-LEFT as fraction (0..1) of page, screen orientation (yPct 0 = top of page). `wPct,hPct` = size as fraction of page. `fontSizePct` = font size as fraction of page HEIGHT (scale-independent). Colors are `#rrggbb`.
- Every task runs `npm test` AND `npm run build` before commit; both clean.

---

### Task 1: overlay-store (objects state)

**Files:** Create `src/services/overlay-store.ts`; Test `src/services/overlay-store.test.ts`

**Interfaces:**
- Produces `OverlayObject` type and a Zustand store `useOverlayStore`:
  - `OverlayObject = { id: string; page: number; type: 'text' | 'image'; xPct: number; yPct: number; wPct: number; hPct: number; text?: string; fontSizePct?: number; color?: string; imageBytes?: Uint8Array; imageType?: 'png' | 'jpeg' }`
  - state: `objects: OverlayObject[]`
  - `addText(page): string` — adds a default text object centered-ish, returns new id.
  - `addImage(page, imageBytes, imageType, wPct, hPct): string` — adds an image object.
  - `updateObject(id, patch: Partial<OverlayObject>): void`
  - `removeObject(id): void`
  - `clear(): void`
  - `objectsForPage(page): OverlayObject[]` (selector helper, exported as a plain function taking the array)
  - ids come from a module-level counter (`o1`, `o2`, …) for deterministic tests.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useOverlayStore, objectsForPage } from './overlay-store'

beforeEach(() => useOverlayStore.getState().clear())

describe('overlay-store', () => {
  it('adds a text object with defaults and returns its id', () => {
    const id = useOverlayStore.getState().addText(0)
    const objs = useOverlayStore.getState().objects
    expect(objs).toHaveLength(1)
    expect(objs[0].id).toBe(id)
    expect(objs[0].type).toBe('text')
    expect(objs[0].page).toBe(0)
    expect(objs[0].text).toBeTypeOf('string')
  })

  it('updates and removes objects', () => {
    const id = useOverlayStore.getState().addText(0)
    useOverlayStore.getState().updateObject(id, { text: 'Hi', xPct: 0.5 })
    expect(useOverlayStore.getState().objects[0].text).toBe('Hi')
    expect(useOverlayStore.getState().objects[0].xPct).toBe(0.5)
    useOverlayStore.getState().removeObject(id)
    expect(useOverlayStore.getState().objects).toHaveLength(0)
  })

  it('filters objects by page', () => {
    useOverlayStore.getState().addText(0)
    useOverlayStore.getState().addText(2)
    const all = useOverlayStore.getState().objects
    expect(objectsForPage(all, 2)).toHaveLength(1)
    expect(objectsForPage(all, 2)[0].page).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify fail** — `npm test -- overlay-store` → FAIL.

- [ ] **Step 3: Implement**
```ts
import { create } from 'zustand'

export interface OverlayObject {
  id: string
  page: number
  type: 'text' | 'image'
  xPct: number
  yPct: number
  wPct: number
  hPct: number
  text?: string
  fontSizePct?: number
  color?: string
  imageBytes?: Uint8Array
  imageType?: 'png' | 'jpeg'
}

let _counter = 0
const nextId = () => `o${++_counter}`

interface OverlayState {
  objects: OverlayObject[]
  addText: (page: number) => string
  addImage: (page: number, imageBytes: Uint8Array, imageType: 'png' | 'jpeg', wPct: number, hPct: number) => string
  updateObject: (id: string, patch: Partial<OverlayObject>) => void
  removeObject: (id: string) => void
  clear: () => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  objects: [],
  addText: (page) => {
    const id = nextId()
    set((s) => ({
      objects: [
        ...s.objects,
        { id, page, type: 'text', xPct: 0.3, yPct: 0.4, wPct: 0.4, hPct: 0.08,
          text: 'Text', fontSizePct: 0.03, color: '#000000' },
      ],
    }))
    return id
  },
  addImage: (page, imageBytes, imageType, wPct, hPct) => {
    const id = nextId()
    set((s) => ({
      objects: [
        ...s.objects,
        { id, page, type: 'image', xPct: 0.3, yPct: 0.3, wPct, hPct, imageBytes, imageType },
      ],
    }))
    return id
  },
  updateObject: (id, patch) =>
    set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),
  clear: () => set({ objects: [] }),
}))

export function objectsForPage(objects: OverlayObject[], page: number): OverlayObject[] {
  return objects.filter((o) => o.page === page)
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add overlay object store for text/image editor"`

---

### Task 2: overlay-coords + hexToRgb (pure mapping)

**Files:** Create `src/services/overlay-coords.ts`; Test `src/services/overlay-coords.test.ts`

**Interfaces:**
- `rectToPdf(o: OverlayObject, pageW: number, pageH: number): { x: number; y: number; width: number; height: number; yTop: number }` — maps normalized rect to PDF points. `x = xPct*pageW`, `width = wPct*pageW`, `height = hPct*pageH`, `yTop = pageH*(1-yPct)` (top edge in PDF up-coords), `y = yTop - height` (bottom edge; the drawImage anchor).
- `fontSizeToPt(o: OverlayObject, pageH: number): number` — `(o.fontSizePct ?? 0.03) * pageH`.
- `hexToRgb01(hex: string): { r: number; g: number; b: number }` — `#rrggbb` → components in 0..1. Falls back to black on bad input.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest'
import { rectToPdf, fontSizeToPt, hexToRgb01 } from './overlay-coords'
import type { OverlayObject } from './overlay-store'

const base: OverlayObject = { id: 'o1', page: 0, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.2 }

describe('overlay-coords', () => {
  it('maps a normalized rect to PDF points (origin bottom-left)', () => {
    const r = rectToPdf(base, 600, 800)
    expect(r).toEqual({ x: 60, width: 300, height: 160, yTop: 720, y: 560 })
  })

  it('maps font size fraction to points', () => {
    expect(fontSizeToPt({ ...base, fontSizePct: 0.05 }, 800)).toBe(40)
    expect(fontSizeToPt(base, 800)).toBeCloseTo(24) // default 0.03 * 800
  })

  it('parses hex colors to 0..1 rgb', () => {
    expect(hexToRgb01('#ff0000')).toEqual({ r: 1, g: 0, b: 0 })
    expect(hexToRgb01('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb01('bad')).toEqual({ r: 0, g: 0, b: 0 })
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement**
```ts
import type { OverlayObject } from './overlay-store'

export function rectToPdf(o: OverlayObject, pageW: number, pageH: number) {
  const x = o.xPct * pageW
  const width = o.wPct * pageW
  const height = o.hPct * pageH
  const yTop = pageH * (1 - o.yPct)
  const y = yTop - height
  return { x, y, width, height, yTop }
}

export function fontSizeToPt(o: OverlayObject, pageH: number): number {
  return (o.fontSizePct ?? 0.03) * pageH
}

export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!m) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
  }
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add overlay coordinate mapping helpers"`

---

### Task 3: flatten service

**Files:** Create `src/services/flatten.ts`; Test `src/services/flatten.test.ts`

**Interfaces:**
- `flattenObjects(bytes: Uint8Array, objects: OverlayObject[]): Promise<Uint8Array>` — draws each object onto its page and returns new bytes. Text: `drawText` at `x`, baseline `yTop - fontSizePt`, size `fontSizeToPt`, Helvetica, color `hexToRgb01`. Image: embed png/jpg then `drawImage` at `{x, y, width, height}`. Objects whose `page` is out of range are skipped. Input not mutated; page count preserved.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { flattenObjects } from './flatten'
import type { OverlayObject } from './overlay-store'

async function blankPdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([600, 800])
  return doc.save()
}

describe('flattenObjects', () => {
  it('draws a text object without changing page count, not mutating input', async () => {
    const bytes = await blankPdf(2)
    const copy = bytes.slice()
    const objs: OverlayObject[] = [
      { id: 'o1', page: 1, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.1, text: 'Hello', fontSizePct: 0.03, color: '#112233' },
    ]
    const out = await flattenObjects(bytes, objs)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
    expect(out.length).not.toBe(bytes.length)
    expect(bytes).toEqual(copy) // input not mutated
  })

  it('skips objects on out-of-range pages', async () => {
    const bytes = await blankPdf(1)
    const objs: OverlayObject[] = [
      { id: 'o1', page: 5, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.1, text: 'x' },
    ]
    const out = await flattenObjects(bytes, objs)
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.

- [ ] **Step 3: Implement**
```ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { OverlayObject } from './overlay-store'
import { rectToPdf, fontSizeToPt, hexToRgb01 } from './overlay-coords'

export async function flattenObjects(
  bytes: Uint8Array,
  objects: OverlayObject[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const pageCount = doc.getPageCount()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const o of objects) {
    if (o.page < 0 || o.page >= pageCount) continue
    const page = doc.getPage(o.page)
    const { width: pw, height: ph } = page.getSize()
    const r = rectToPdf(o, pw, ph)
    if (o.type === 'text') {
      const size = fontSizeToPt(o, ph)
      const c = hexToRgb01(o.color ?? '#000000')
      page.drawText(o.text ?? '', {
        x: r.x,
        y: r.yTop - size,
        size,
        font,
        color: rgb(c.r, c.g, c.b),
      })
    } else if (o.type === 'image' && o.imageBytes) {
      const img =
        o.imageType === 'jpeg'
          ? await doc.embedJpg(o.imageBytes)
          : await doc.embedPng(o.imageBytes)
      page.drawImage(img, { x: r.x, y: r.y, width: r.width, height: r.height })
    }
  }
  return doc.save()
}
```

- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: add flatten service to bake overlay objects into pdf"`

---

### Task 4: react-rnd object component

**Files:** install `react-rnd`; Create `src/components/OverlayObjectView.tsx`; Test `src/components/overlayObjectView.test.tsx`

**Interfaces:**
- `OverlayObjectView` props: `{ obj: OverlayObject; pageWidthPx: number; pageHeightPx: number; selected: boolean; onSelect: () => void; onChange: (patch: Partial<OverlayObject>) => void; onDelete: () => void }`. Renders a react-rnd box positioned at `obj.xPct*pageWidthPx / yPct*pageHeightPx`, size `wPct*pageWidthPx / hPct*pageHeightPx`. On drag/resize stop, converts px back to Pct and calls `onChange`. Text objects render an editable element (textarea/contentEditable) that calls `onChange({text})`; image objects render an `<img>` from an object URL of the bytes. Shows a small ✕ delete button when selected.

- [ ] **Step 1: Install** — `npm install react-rnd`
- [ ] **Step 2: Write the failing test**
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OverlayObjectView from './OverlayObjectView'
import type { OverlayObject } from '../services/overlay-store'

const textObj: OverlayObject = { id: 'o1', page: 0, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.4, hPct: 0.1, text: 'Hi', fontSizePct: 0.03, color: '#000000' }

describe('OverlayObjectView', () => {
  it('renders text content and fires onChange on edit', async () => {
    const onChange = vi.fn()
    render(<OverlayObjectView obj={textObj} pageWidthPx={600} pageHeightPx={800} selected onSelect={() => {}} onChange={onChange} onDelete={() => {}} />)
    const box = screen.getByTestId('overlay-text')
    expect(box).toHaveTextContent('Hi')
    await userEvent.type(box, '!')
    expect(onChange).toHaveBeenCalled()
  })

  it('fires onDelete when the delete button is clicked', async () => {
    const onDelete = vi.fn()
    render(<OverlayObjectView obj={textObj} pageWidthPx={600} pageHeightPx={800} selected onSelect={() => {}} onChange={() => {}} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete object' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 3: Run to verify fail** — FAIL.
- [ ] **Step 4: Implement** `OverlayObjectView.tsx` using `Rnd` from 'react-rnd':
  - position `{ x: obj.xPct*pageWidthPx, y: obj.yPct*pageHeightPx }`, size `{ width: obj.wPct*pageWidthPx, height: obj.hPct*pageHeightPx }`.
  - `onDragStop={(_,d) => onChange({ xPct: d.x/pageWidthPx, yPct: d.y/pageHeightPx })}`.
  - `onResizeStop={(_,__,ref,___,pos) => onChange({ wPct: ref.offsetWidth/pageWidthPx, hPct: ref.offsetHeight/pageHeightPx, xPct: pos.x/pageWidthPx, yPct: pos.y/pageHeightPx })}`.
  - `onMouseDown={onSelect}`; selected → show border + a ✕ button (`aria-label="Delete object"`) calling `onDelete`.
  - text: a `div data-testid="overlay-text" contentEditable suppressContentEditableWarning onInput={e => onChange({ text: e.currentTarget.textContent ?? '' })}` styled with `fontSize: obj.fontSizePct*pageHeightPx`, `color: obj.color`.
  - image: `<img src={objectURL} style={{width:'100%',height:'100%'}} />` (create/revoke object URL from obj.imageBytes in a useEffect).
- [ ] **Step 5: Run to verify pass** — PASS.
- [ ] **Step 6: Full check** — `npm test`; `npm run build` clean.
- [ ] **Step 7: Commit** — `git commit -m "feat: add react-rnd overlay object component"`

---

### Task 5: OverlayLayer + wire Add text / Add picture into App

**Files:** Create `src/components/OverlayLayer.tsx`; Modify `src/App.tsx`, `src/components/Toolbar.tsx`; Test `src/components/overlayLayer.test.tsx`

**Interfaces:**
- `OverlayLayer` props: `{ page: number; pageWidthPx: number; pageHeightPx: number }` — reads `useOverlayStore`, renders an absolutely-positioned layer over the viewer containing an `OverlayObjectView` per object on `page`; manages a local `selectedId`; wires onSelect/onChange(updateObject)/onDelete(removeObject).
- App: **Add text** button → `useOverlayStore.addText(selected-1)`; **Add picture** button → hidden file input (image/*) → read bytes + natural size → `addImage(selected-1, bytes, type, wPct, hPct)`. Render `<OverlayLayer>` over the viewer PageCanvas sized to the rendered canvas. Toolbar gets `onAddText` + `onAddImage` props/buttons (disabled `!hasDoc`).

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import OverlayLayer from './OverlayLayer'
import { useOverlayStore } from '../services/overlay-store'

beforeEach(() => useOverlayStore.getState().clear())

it('renders one object box per object on the page', () => {
  useOverlayStore.getState().addText(0)
  useOverlayStore.getState().addText(0)
  useOverlayStore.getState().addText(1)
  render(<OverlayLayer page={0} pageWidthPx={600} pageHeightPx={800} />)
  expect(screen.getAllByTestId('overlay-text')).toHaveLength(2)
})
```

- [ ] **Step 2: Run to verify fail** — FAIL.
- [ ] **Step 3: Implement OverlayLayer** (maps objectsForPage → OverlayObjectView, manages selectedId, absolute inset-0 container). Wire App + Toolbar Add text / Add picture buttons and the image file input (compute wPct/hPct from the image's natural aspect vs page — a reasonable default like wPct=0.3 and hPct = 0.3 * (imgH/imgW) * (pageWpx/pageHpx); keep simple). Render OverlayLayer inside the Viewer, overlaid on the main PageCanvas (wrap them in a `relative` container; the layer is `absolute inset-0`). Use the canvas's displayed pixel size for pageWidthPx/pageHeightPx (measure via a ref or derive from zoom * page size).
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean; manually verify in browser: Add text → a box appears, drag/resize/edit works; Add picture → image appears and is movable.
- [ ] **Step 6: Commit** — `git commit -m "feat: overlay editing layer with add text/picture"`

---

### Task 6: Apply / flatten on export + clear

**Files:** Modify `src/App.tsx`; Test extend `src/components/overlayLayer.test.tsx` or a new `applyOverlay.test.tsx`

**Interfaces:**
- App gains an **Apply** toolbar button (enabled when there are overlay objects) that flattens the current page-set's objects into the document: `run(apply((b) => flattenObjects(b, useOverlayStore.getState().objects)))` then `useOverlayStore.getState().clear()`. Also flatten automatically before a PDF Download if there are pending objects (so exported PDF includes them). After flatten+clear, the baked content shows because the document re-renders from new bytes.

- [ ] **Step 1: Write the failing test**
```tsx
it('Apply flattens overlay objects into the document and clears them', async () => {
  // load a 1-page doc into document-store, add a text object, click Apply
  // assert overlay store cleared and document bytes changed (page count preserved)
  // (render-service mocked; document-store seeded in beforeEach)
})
```
(Write it concretely against `useDocumentStore` + `useOverlayStore`, mocking render-service `{cancel, done}`; assert `useOverlayStore.getState().objects` is empty after Apply and `getPageCount` unchanged, bytes changed.)

- [ ] **Step 2: Run to verify fail** — FAIL.
- [ ] **Step 3: Implement** — Toolbar `onApply` button (disabled unless `objectCount > 0`; pass `objectCount` from `useOverlayStore` via App). App `onApply = () => run((async () => { await apply((b) => flattenObjects(b, useOverlayStore.getState().objects)); useOverlayStore.getState().clear() })())`. In `onDownload` PDF branch, if `objects.length` flatten first: build the export bytes via `flattenObjects(bytes, objects)` then download (don't necessarily mutate store bytes unless Apply). Import `flattenObjects` from services/flatten. Reset overlay on `onOpen` (`useOverlayStore.getState().clear()`).
- [ ] **Step 4: Run to verify pass** — PASS.
- [ ] **Step 5: Full check** — `npm test`; `npm run build` clean; manually verify: add text+image, Apply → they bake into the page (visible in preview, survive Download); Undo reverts the flatten.
- [ ] **Step 6: Commit** — `git commit -m "feat: apply/flatten overlay objects into the pdf"`

---

## After this plan
The editor covers text + image objects (add/move/resize/edit/delete/flatten). Follow-ups: per-object rotation, font family/bold picker, image aspect-lock on resize, multi-object select. Then the remaining pro features (lock/unlock via qpdf-wasm, Office→PDF convert) and Phase C (shrink file size). A UI polish pass with the design-taste skills can happen any time.

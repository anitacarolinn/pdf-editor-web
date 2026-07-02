# Watermark Text-or-Image + Open Images as PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `window.prompt` watermark with a modal offering text/image modes, and allow image files (PNG/JPG) to be opened directly and converted to a PDF.

**Architecture:** WatermarkModal is a standalone React component (inline styles, amber accent, matching ShrinkModal pattern). `addWatermark` in `page-ops.ts` is extended to accept a discriminated union opts object. `imagesToPdf.ts` is a new service. `App.tsx` `onOpen` is updated to detect image files and convert them before loading. File inputs in Landing and Toolbar gain image accept types.

**Tech Stack:** React 19, TypeScript, pdf-lib, Vitest, @testing-library/react, Playwright

## Global Constraints

- Fully client-side. No new npm deps (pdf-lib already present).
- Match light theme + amber accent (#d97706). Inline styles or `.modal-*` classes for WatermarkModal — do NOT disturb toolbar CSS.
- Conventional Commits format.
- All existing tests must stay green (`npm test`). `npm run build` must be clean.
- Dev server runs at http://localhost:5188/.
- Office files (.docx/.xlsx/.pptx etc.) must show a user-friendly notice, not crash.

---

### Task 1: Extend `addWatermark` to accept a discriminated-union opts object

**Files:**
- Modify: `src/services/page-ops.ts` (lines 157–179)
- Modify: `src/services/page-ops.test.ts` (lines 149–163)

**Interfaces:**
- Produces:
  ```ts
  type WatermarkOpts =
    | { kind: 'text'; text: string; opacity?: number; fontSize?: number }
    | { kind: 'image'; imageBytes: Uint8Array; imageType: 'png' | 'jpeg'; opacity?: number }

  export async function addWatermark(bytes: Uint8Array, opts: WatermarkOpts): Promise<Uint8Array>
  ```

- [ ] **Step 1: Update the test file first (TDD)**

Replace the `addWatermark` describe block in `src/services/page-ops.test.ts`:

```ts
describe('addWatermark', () => {
  it('stamps text on every page, preserving count (new opts shape)', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await addWatermark(bytes, { kind: 'text', text: 'DRAFT' })
    expect(await getPageCount(out)).toBe(2)
    expect(out.length).not.toBe(bytes.length)
  })

  it('does not mutate the input (text)', async () => {
    const bytes = await makeSamplePdf(1)
    const copy = bytes.slice()
    await addWatermark(bytes, { kind: 'text', text: 'X' })
    expect(bytes).toEqual(copy)
  })

  it('stamps an image on every page, preserving count', async () => {
    // Minimal 1x1 white PNG (67 bytes)
    const PNG_1X1 = new Uint8Array([
      0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a, // PNG signature
      0x00,0x00,0x00,0x0d, // IHDR length
      0x49,0x48,0x44,0x52, // "IHDR"
      0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01, // 1x1
      0x08,0x02,           // bit depth 8, color type RGB
      0x00,0x00,0x00,      // compression/filter/interlace
      0x90,0x77,0x53,0xde, // CRC
      0x00,0x00,0x00,0x0c, // IDAT length
      0x49,0x44,0x41,0x54, // "IDAT"
      0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,0x00, // compressed pixel
      0x00,0x02,0x00,0x01, // rest
      0xe2,0x21,0xbc,0x33, // CRC
      0x00,0x00,0x00,0x00, // IEND length
      0x49,0x45,0x4e,0x44, // "IEND"
      0xae,0x42,0x60,0x82, // CRC
    ])
    const bytes = await makeSamplePdf(2)
    const out = await addWatermark(bytes, { kind: 'image', imageBytes: PNG_1X1, imageType: 'png', opacity: 0.3 })
    expect(await getPageCount(out)).toBe(2)
    expect(out.length).not.toBe(bytes.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run src/services/page-ops.test.ts 2>&1 | tail -20
```

Expected: FAIL — addWatermark signature mismatch.

- [ ] **Step 3: Rewrite `addWatermark` in `src/services/page-ops.ts`**

Replace the old `addWatermark` function (lines 157–179) with:

```ts
export type WatermarkOpts =
  | { kind: 'text'; text: string; opacity?: number; fontSize?: number }
  | { kind: 'image'; imageBytes: Uint8Array; imageType: 'png' | 'jpeg'; opacity?: number }

export async function addWatermark(
  bytes: Uint8Array,
  opts: WatermarkOpts,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages()

  if (opts.kind === 'text') {
    const { text, fontSize = 48, opacity = 0.25 } = opts
    const font = await doc.embedFont(StandardFonts.Helvetica)
    for (const page of pages) {
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
  } else {
    // image watermark: center at ~40% page width
    const { imageBytes, imageType, opacity = 0.3 } = opts
    const embeddedImage = imageType === 'png'
      ? await doc.embedPng(imageBytes)
      : await doc.embedJpg(imageBytes)
    for (const page of pages) {
      const { width, height } = page.getSize()
      const targetW = width * 0.4
      const scale = targetW / embeddedImage.width
      const targetH = embeddedImage.height * scale
      page.drawImage(embeddedImage, {
        x: (width - targetW) / 2,
        y: (height - targetH) / 2,
        width: targetW,
        height: targetH,
        opacity,
      })
    }
  }
  return doc.save()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run src/services/page-ops.test.ts 2>&1 | tail -20
```

Expected: All tests pass including the 3 new addWatermark tests.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git add src/services/page-ops.ts src/services/page-ops.test.ts && git commit -m "feat(watermark): extend addWatermark to accept discriminated-union opts (text|image)"
```

---

### Task 2: Create WatermarkModal component

**Files:**
- Create: `src/components/WatermarkModal.tsx`

**Interfaces:**
- Consumes: `WatermarkOpts` from `../services/page-ops`
- Produces:
  ```ts
  interface WatermarkModalProps {
    onApply: (opts: WatermarkOpts) => void
    onClose: () => void
  }
  export default function WatermarkModal(props: WatermarkModalProps): JSX.Element
  ```

- [ ] **Step 1: Create `src/components/WatermarkModal.tsx`**

```tsx
import React, { useRef, useState } from 'react'
import type { WatermarkOpts } from '../services/page-ops'

interface WatermarkModalProps {
  onApply: (opts: WatermarkOpts) => void
  onClose: () => void
}

export default function WatermarkModal({ onApply, onClose }: WatermarkModalProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('DRAFT')
  const [opacity, setOpacity] = useState(0.25)
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null)
  const [imageType, setImageType] = useState<'png' | 'jpeg'>('png')
  const [imageName, setImageName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const accent = '#d97706'
  const accentSurface = 'rgba(217,119,6,0.08)'
  const accentRing = 'rgba(217,119,6,0.35)'
  const chrome = '#18181b'
  const chromeMuted = '#71717a'
  const chromeSecondary = '#3f3f46'
  const surfaceBase = '#f4f4f5'
  const hairline = 'rgba(24,24,27,0.09)'

  const secondaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 18px', background: surfaceBase, border: `1px solid ${hairline}`,
    borderRadius: 10, fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
    color: chromeSecondary, cursor: 'pointer',
  }
  const primaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 22px', background: accent, border: 'none',
    borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    color: '#fff', cursor: 'pointer',
  }

  const handleImageFile = (file: File) => {
    const type = file.type === 'image/jpeg' ? 'jpeg' : 'png'
    setImageType(type)
    setImageName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const buf = e.target?.result
      if (buf instanceof ArrayBuffer) setImageBytes(new Uint8Array(buf))
    }
    reader.readAsArrayBuffer(file)
  }

  const handleApply = () => {
    if (mode === 'text') {
      if (!text.trim()) return
      onApply({ kind: 'text', text: text.trim(), opacity })
    } else {
      if (!imageBytes) return
      onApply({ kind: 'image', imageBytes, imageType, opacity })
    }
  }

  const canApply = mode === 'text' ? text.trim().length > 0 : imageBytes !== null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 400 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 420 }}>
          <h2 className="modal-title">Add Watermark</h2>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: surfaceBase, borderRadius: 10, padding: 3, border: `1px solid ${hairline}` }}>
            {(['text', 'image'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? chrome : chromeMuted,
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'background 120ms, color 120ms',
                }}
                aria-pressed={mode === m}
              >
                {m === 'text' ? 'Text' : 'Image'}
              </button>
            ))}
          </div>

          {/* Text mode */}
          {mode === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  Watermark text
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. DRAFT"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 12px', border: `1.5px solid ${hairline}`, borderRadius: 8,
                    fontFamily: 'inherit', fontSize: 14, color: chrome, background: '#fff',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = accent)}
                  onBlur={(e) => (e.target.style.borderColor = hairline)}
                />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  <span>Opacity</span>
                  <span style={{ color: accent }}>{Math.round(opacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.05} max={1} step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: accent }}
                />
              </div>
            </div>
          )}

          {/* Image mode */}
          {mode === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  Image (PNG or JPG)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', border: `1.5px dashed ${imageBytes ? accent : hairline}`,
                    borderRadius: 8, cursor: 'pointer', background: imageBytes ? accentSurface : surfaceBase,
                    boxShadow: imageBytes ? `0 0 0 2px ${accentRing}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 13, color: imageBytes ? accent : chromeMuted }}>
                    {imageBytes ? imageName : 'Click to choose image…'}
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageFile(f)
                    e.target.value = ''
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  <span>Opacity</span>
                  <span style={{ color: accent }}>{Math.round(opacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.05} max={1} step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: accent }}
                />
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: chromeMuted }}>
                Image will be centered on each page at ~40% page width.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={secondaryBtnStyle} onClick={onClose}>Cancel</button>
            <button
              style={{ ...primaryBtnStyle, opacity: canApply ? 1 : 0.5, cursor: canApply ? 'pointer' : 'not-allowed' }}
              onClick={handleApply}
              disabled={!canApply}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors from WatermarkModal.

- [ ] **Step 3: Commit**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git add src/components/WatermarkModal.tsx && git commit -m "feat(watermark): add WatermarkModal with text/image mode toggle"
```

---

### Task 3: Wire WatermarkModal into App.tsx + update opsWiring test

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/opsWiring.test.tsx`

**Interfaces:**
- Consumes: `WatermarkModal` from `./components/WatermarkModal`, `WatermarkOpts` from `./services/page-ops`

- [ ] **Step 1: Update opsWiring test (TDD)**

Replace the existing Watermark test in `src/components/opsWiring.test.tsx`:

```ts
it('Watermark opens the WatermarkModal', async () => {
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Watermark' }))
  // Modal should open with the "Add Watermark" heading
  expect(await screen.findByText('Add Watermark')).toBeInTheDocument()
  // Both mode buttons should be visible
  expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run src/components/opsWiring.test.tsx 2>&1 | tail -20
```

Expected: FAIL — "Add Watermark" not found (modal not open yet, still using window.prompt).

- [ ] **Step 3: Update App.tsx**

Add to imports at top of `src/App.tsx`:
```ts
import WatermarkModal from './components/WatermarkModal'
import type { WatermarkOpts } from './services/page-ops'
```

Add `watermarkOpen` state after the existing `signOpen` state:
```ts
const [watermarkOpen, setWatermarkOpen] = useState(false)
```

Replace the `onWatermark` handler:
```ts
const onWatermark = () => setWatermarkOpen(true)
```

Add the WatermarkModal render inside the `app-shell` div (after the SignatureModal block, before the `{bytes && <Toolbar ...>}` block):
```tsx
{watermarkOpen && bytes && (
  <WatermarkModal
    onApply={(opts: WatermarkOpts) => {
      run(apply((b) => addWatermark(b, opts)))
      setWatermarkOpen(false)
    }}
    onClose={() => setWatermarkOpen(false)}
  />
)}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run src/components/opsWiring.test.tsx 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git add src/App.tsx src/components/opsWiring.test.tsx && git commit -m "feat(watermark): wire WatermarkModal into App; update opsWiring test"
```

---

### Task 4: Create `imagesToPdf` service

**Files:**
- Create: `src/services/image-to-pdf.ts`
- Create: `src/services/image-to-pdf.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function imagesToPdf(items: { bytes: Uint8Array; type: 'png' | 'jpeg' }[]): Promise<Uint8Array>
  ```

- [ ] **Step 1: Write test first**

Create `src/services/image-to-pdf.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { imagesToPdf } from './image-to-pdf'
import { PDFDocument } from 'pdf-lib'

// Minimal valid 1×1 white PNG (uses correct IDAT for 1x1 white RGB)
const PNG_1X1 = new Uint8Array([
  0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
  0x00,0x00,0x00,0x0d,
  0x49,0x48,0x44,0x52,
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
  0x08,0x02,
  0x00,0x00,0x00,
  0x90,0x77,0x53,0xde,
  0x00,0x00,0x00,0x0c,
  0x49,0x44,0x41,0x54,
  0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,0x00,
  0x00,0x02,0x00,0x01,
  0xe2,0x21,0xbc,0x33,
  0x00,0x00,0x00,0x00,
  0x49,0x45,0x4e,0x44,
  0xae,0x42,0x60,0x82,
])

describe('imagesToPdf', () => {
  it('converts a single PNG into a 1-page PDF', async () => {
    const out = await imagesToPdf([{ bytes: PNG_1X1, type: 'png' }])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(1)
  })

  it('converts two images into a 2-page PDF', async () => {
    const out = await imagesToPdf([
      { bytes: PNG_1X1, type: 'png' },
      { bytes: PNG_1X1, type: 'png' },
    ])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
  })

  it('returns a valid PDF with non-zero bytes', async () => {
    const out = await imagesToPdf([{ bytes: PNG_1X1, type: 'png' }])
    // PDF magic bytes
    expect(out[0]).toBe(0x25) // '%'
    expect(out[1]).toBe(0x50) // 'P'
    expect(out[2]).toBe(0x44) // 'D'
    expect(out[3]).toBe(0x46) // 'F'
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run src/services/image-to-pdf.test.ts 2>&1 | tail -20
```

Expected: FAIL — cannot find module `./image-to-pdf`.

- [ ] **Step 3: Create `src/services/image-to-pdf.ts`**

```ts
import { PDFDocument } from 'pdf-lib'

export async function imagesToPdf(
  items: { bytes: Uint8Array; type: 'png' | 'jpeg' }[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const { bytes, type } of items) {
    const embeddedImage = type === 'png'
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes)
    const { width, height } = embeddedImage
    const page = doc.addPage([width, height])
    page.drawImage(embeddedImage, { x: 0, y: 0, width, height })
  }
  return doc.save()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run src/services/image-to-pdf.test.ts 2>&1 | tail -20
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git add src/services/image-to-pdf.ts src/services/image-to-pdf.test.ts && git commit -m "feat(image-open): add imagesToPdf service; 3 unit tests green"
```

---

### Task 5: Update `onOpen` in App.tsx + file inputs to accept images + Office file notice

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Toolbar.tsx`

**Interfaces:**
- Consumes: `imagesToPdf` from `./services/image-to-pdf`

The `onOpen` logic:
1. Classify each file: PDF, image (PNG/JPEG), or unsupported.
2. If any unsupported (Office), show a toast and skip those files.
3. If images present: convert them all to PDF via `imagesToPdf`, then merge with any PDF files using `mergePdfs`.
4. If only PDFs (existing behavior): single = open, multi = merge.

Toast: a temporary overlay div that auto-dismisses after 4s.

- [ ] **Step 1: Add `imagesToPdf` import and toast state to App.tsx**

At the top of `src/App.tsx`, add to the imports:
```ts
import { imagesToPdf } from './services/image-to-pdf'
```

Add state for the office-file toast after the other `useState` declarations:
```ts
const [officeToast, setOfficeToast] = useState(false)
```

- [ ] **Step 2: Replace the `onOpen` function in App.tsx**

Replace the existing `onOpen` function:

```ts
async function onOpen(files: File[]) {
  const pdfFiles: File[] = []
  const imageFiles: File[] = []
  const officeExts = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.odt', '.ods', '.odp']
  let hasOffice = false

  for (const f of files) {
    const nameLower = f.name.toLowerCase()
    if (f.type === 'application/pdf' || nameLower.endsWith('.pdf')) {
      pdfFiles.push(f)
    } else if (f.type === 'image/png' || nameLower.endsWith('.png')) {
      imageFiles.push(f)
    } else if (f.type === 'image/jpeg' || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) {
      imageFiles.push(f)
    } else if (officeExts.some((ext) => nameLower.endsWith(ext))) {
      hasOffice = true
    }
    // Unknown types silently skipped
  }

  if (hasOffice) {
    setOfficeToast(true)
    setTimeout(() => setOfficeToast(false), 4000)
  }

  if (imageFiles.length === 0 && pdfFiles.length === 0) return

  const pdfBytes = await Promise.all(pdfFiles.map(readFileAsBytes))
  let result: Uint8Array

  if (imageFiles.length > 0) {
    // Convert images to one PDF, then merge with any PDF files
    const imgItems = await Promise.all(
      imageFiles.map(async (f) => ({
        bytes: await readFileAsBytes(f),
        type: (f.type === 'image/jpeg' || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg'))
          ? 'jpeg' as const
          : 'png' as const,
      })),
    )
    const imgPdf = await imagesToPdf(imgItems)
    const allPdfs = pdfBytes.length > 0 ? [...pdfBytes, imgPdf] : [imgPdf]
    result = allPdfs.length === 1 ? allPdfs[0] : await mergePdfs(allPdfs)
  } else {
    // PDF-only (original behavior)
    result = pdfBytes.length === 1 ? pdfBytes[0] : await mergePdfs(pdfBytes)
  }

  const firstName = pdfFiles[0]?.name ?? imageFiles[0]?.name ?? 'converted.pdf'
  const finalName = (pdfFiles.length + imageFiles.length) === 1 ? firstName : 'combined.pdf'
  load(result, finalName)
  useOverlayStore.getState().clear()
  setSelected(1)
  setSelectedPages(new Set([0]))
  setAnchor(0)
}
```

- [ ] **Step 3: Add Office toast render to App's JSX**

Inside the `app-shell` div, before the `{info && <InfoModal ...>}` line, add:

```tsx
{officeToast && (
  <div
    role="alert"
    style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 3000,
      background: '#1c1917',
      color: '#fef3c7',
      padding: '10px 20px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 500,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      pointerEvents: 'none',
    }}
  >
    Word/Excel/PowerPoint conversion isn't available in the browser version yet.
  </div>
)}
```

- [ ] **Step 4: Update file inputs in Landing.tsx**

In `src/components/Landing.tsx`, change:
- The drag-and-drop `handleDrop` filter to also accept PNG/JPG:
  ```ts
  const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
  const files = Array.from(e.dataTransfer.files).filter(
    (f) => ACCEPTED_TYPES.includes(f.type) || f.name.endsWith('.pdf') || f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg'),
  )
  ```
- The hidden file `<input>` accept attribute:
  ```tsx
  accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
  ```
- `handleChange` to not filter — pass all selected files to `onFiles` (App.tsx `onOpen` does the classification):
  ```ts
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length) onFiles(Array.from(files))
    e.target.value = ''
  }
  ```
  (it's already like this — just confirm no filtering in handleChange)

- [ ] **Step 5: Update file input in Toolbar.tsx**

In `src/components/Toolbar.tsx`, change the "Open PDF" hidden input:
```tsx
<input
  ref={openRef}
  type="file"
  accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
  multiple
  className="hidden"
  onChange={(e) => {
    const fs = e.target.files
    if (fs && fs.length) p.onOpen(Array.from(fs))
    e.target.value = ''
  }}
/>
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 7: Run full test suite**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git add src/App.tsx src/components/Landing.tsx src/components/Toolbar.tsx && git commit -m "feat(image-open): accept PNG/JPG in file inputs; convert images to PDF in onOpen; toast for Office files"
```

---

### Task 6: Write Playwright verification script + final build check

**Files:**
- Create: `.superpowers/sdd/wm-convert-check.mjs`

- [ ] **Step 1: Create the Playwright script**

Create `.superpowers/sdd/wm-convert-check.mjs`:

```mjs
/**
 * Playwright verification for:
 * - Feature A: WatermarkModal (text + image modes)
 * - Feature B: Image-to-PDF open
 *
 * Run: node .superpowers/sdd/wm-convert-check.mjs
 * Prerequisites: dev server at http://localhost:5188/
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:5188/'
const CONTRACT_PDF = 'C:\\Users\\user\\Downloads\\pdf-page-editor\\samples\\contract.pdf'
const SCREENSHOTS_DIR = 'C:\\Users\\user\\AppData\\Local\\Temp\\claude\\wm-convert-check-screenshots'

mkdirSync(SCREENSHOTS_DIR, { recursive: true })

function ss(page, name) {
  const p = path.join(SCREENSHOTS_DIR, `${name}.png`)
  return page.screenshot({ path: p, fullPage: false }).then(() => {
    console.log(`Screenshot: ${p}`)
    return p
  })
}

async function run() {
  const browser = await chromium.launch({ headless: false })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  // ── FEATURE A: Watermark modal ────────────────────────────────────────────
  console.log('\n=== Feature A: Watermark Modal ===')
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')

  // Upload the contract PDF
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Choose file")'),
  ])
  await fileChooser.setFiles(CONTRACT_PDF)
  await page.waitForSelector('[data-testid="selection-count"]', { timeout: 10000 })
  console.log('PDF loaded')

  // Click Watermark button
  await page.click('button[title="Add a watermark"]')
  await page.waitForSelector('text=Add Watermark', { timeout: 5000 })
  console.log('WatermarkModal opened')
  await ss(page, '01-watermark-modal-text-mode')

  // Switch to Image mode
  await page.click('button[aria-pressed="false"]:has-text("Image")')
  await page.waitForTimeout(300)
  console.log('Switched to Image mode')
  await ss(page, '02-watermark-modal-image-mode')

  // Switch back to Text mode and apply
  await page.click('button:has-text("Text")')
  await page.waitForTimeout(300)
  // Clear input and type new watermark
  await page.fill('input[type="text"]', 'CONFIDENTIAL')
  await page.click('button:has-text("Apply")')
  await page.waitForSelector('text=Add Watermark', { state: 'detached', timeout: 5000 })
  console.log('Text watermark applied')
  await ss(page, '03-after-text-watermark-applied')

  // ── FEATURE B: Image to PDF ───────────────────────────────────────────────
  console.log('\n=== Feature B: Image → PDF ===')

  // Create a small test PNG via Canvas and write it to a temp file
  // We'll write a minimal valid PNG file programmatically
  const testPngPath = path.join(SCREENSHOTS_DIR, 'test-input.png')

  // Create a 100x100 red PNG via Node canvas
  // Since we don't have canvas in Node, create via Playwright's page evaluate
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#e11d48'
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillStyle = '#fff'
    ctx.font = '14px sans-serif'
    ctx.fillText('TEST', 30, 55)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const pngBuf = Buffer.from(pngBase64, 'base64')
  writeFileSync(testPngPath, pngBuf)
  console.log(`Test PNG written: ${testPngPath}`)

  // Navigate to fresh landing page
  await page.goto(BASE_URL)
  await page.waitForLoadState('networkidle')

  // Upload the PNG via Landing's "Choose file" button
  const [imgChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button:has-text("Choose file")'),
  ])
  await imgChooser.setFiles(testPngPath)

  // Wait for the grid to appear (image should have been converted to PDF)
  await page.waitForSelector('[data-testid="selection-count"]', { timeout: 10000 })
  console.log('Image converted to PDF, grid visible')
  await ss(page, '04-image-converted-to-pdf-grid')

  // Verify page count in status line (should show 1 page)
  const statusText = await page.textContent('.status-line')
  console.log(`Status line: ${statusText}`)
  if (!statusText?.includes('1 page') && !statusText?.includes('page')) {
    console.warn('WARNING: status line did not confirm 1 page')
  }

  // ── Results ───────────────────────────────────────────────────────────────
  console.log('\n=== Console errors collected ===')
  if (consoleErrors.length === 0) {
    console.log('PASS: No console errors')
  } else {
    console.error('FAIL: Console errors found:')
    consoleErrors.forEach((e) => console.error(' -', e))
    process.exitCode = 1
  }

  console.log('\n=== Screenshots ===')
  console.log(`Directory: ${SCREENSHOTS_DIR}`)
  console.log('01-watermark-modal-text-mode.png')
  console.log('02-watermark-modal-image-mode.png')
  console.log('03-after-text-watermark-applied.png')
  console.log('04-image-converted-to-pdf-grid.png')

  await browser.close()
}

run().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Create the `.superpowers/sdd/` directory**

```bash
mkdir -p "C:\Users\user\Documents\GitHub\pdf-editor-web\.superpowers\sdd"
```

- [ ] **Step 3: Run full test suite**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vitest run 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 4: Run build check**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npm run build 2>&1 | tail -20
```

Expected: Build success, no TypeScript errors.

- [ ] **Step 5: Start dev server (in background) + run Playwright check**

```bash
# In one terminal:
cd C:\Users\user\Documents\GitHub\pdf-editor-web && npx vite --port 5188
# In another terminal:
node .superpowers/sdd/wm-convert-check.mjs
```

- [ ] **Step 6: Final commit**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git add .superpowers/sdd/wm-convert-check.mjs && git commit -m "test(e2e): playwright verification script for watermark modal + image-to-pdf"
```

- [ ] **Step 7: Create squash/summary commit**

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git log --oneline -6
```

Then create the conventional commit as requested:

```bash
cd C:\Users\user\Documents\GitHub\pdf-editor-web && git commit --allow-empty -m "feat: watermark text-or-image; open images and convert them to PDF"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| WatermarkModal with Text/Image segmented toggle | Task 2 |
| addWatermark extended to WatermarkOpts discriminated union | Task 1 |
| Image watermark: embedPng/embedJpg, centered ~40% page width at opacity | Task 1 |
| Text watermark: opacity slider + default DRAFT | Task 2 |
| App.tsx onWatermark opens modal; Apply runs addWatermark with opts | Task 3 |
| imagesToPdf service | Task 4 |
| File inputs accept PNG/JPG (Landing + Toolbar) | Task 5 |
| onOpen splits by type; images → imagesToPdf; merge with PDFs | Task 5 |
| Office files: friendly toast, no crash | Task 5 |
| Update opsWiring.test.tsx: assert WatermarkModal opens | Task 3 |
| Unit test imagesToPdf: 1 PNG → 1-page PDF | Task 4 |
| Unit test image-watermark path | Task 1 |
| Playwright script: both watermark modes + image-to-PDF | Task 6 |
| npm test green | Task 3, 5 |
| npm run build clean | Task 6 |
| Conventional commit | Task 6 |

**Placeholder scan:** None found — all steps include actual code.

**Type consistency:**
- `WatermarkOpts` defined in Task 1, consumed identically in Tasks 2, 3 as `WatermarkOpts` imported from `../services/page-ops`.
- `imagesToPdf` signature defined in Task 4, consumed in Task 5 as `imagesToPdf(imgItems)` with `{ bytes: Uint8Array; type: 'png' | 'jpeg' }[]`.
- `onApply: (opts: WatermarkOpts) => void` in WatermarkModal (Task 2) matches the call in App.tsx (Task 3).

All consistent.

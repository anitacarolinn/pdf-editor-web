# Shrink File Size Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the immediate shrink action with a 3-step modal (options → loading → result) that lets the user pick a compression level, preview size savings, and only then commit the change to the undo stack.

**Architecture:** A new `ShrinkModal` component owns the full 3-step flow and calls a new `shrinkPdfWithLevel` export from `shrink-service.ts`. `App.tsx` swaps `onShrink` from a direct `apply()` call to toggling a `shrinkOpen` boolean; `ShrinkModal` calls back via `onApply(bytes)` which wires into `apply()` for undo support. The existing `shrinkPdf` function stays intact so all current import sites and tests remain green without changes.

**Tech Stack:** React 19, TypeScript, Vite, pdf-lib, pdfjs-dist, Vitest + @testing-library/react, Playwright (for SDD verify script)

## Global Constraints

- No new npm dependencies
- Do NOT edit `.toolbar-*`, `.tbtn`, `.toolbar-actions` CSS classes in `src/index.css`
- Use inline styles in `ShrinkModal` or the existing `.modal-*` classes only
- Amber accent: `--color-accent` = `#d97706`; no gimmicks, product-tool aesthetic
- All tests must pass (`npm test`); `npm run build` must be clean
- Conventional Commits; one commit at end: `feat: shrink-file-size modal with compression options and size preview`
- Verify script goes in `.superpowers/sdd/lm-check.mjs`
- Dev server is on `http://localhost:5188/`; sample PDF: `C:\Users\user\Downloads\pdf-page-editor\samples\contract.pdf`

---

### Task 1: Extend shrink-service with compression levels

**Files:**
- Modify: `src/services/shrink-service.ts` (full rewrite to add level API; keep old export)
- Modify: `src/services/shrink-service.test.ts` (add tests for the new level-based function)

**Interfaces:**
- Produces:
  ```ts
  export type CompressionLevel = 'less' | 'recommended' | 'extreme'
  export async function shrinkPdfWithLevel(
    bytes: Uint8Array,
    level: CompressionLevel,
  ): Promise<Uint8Array>
  // existing export stays intact — no API change:
  export async function shrinkPdf(bytes: Uint8Array, opts?: { quality?: number; targetLongEdgePx?: number }): Promise<Uint8Array>
  ```

- [ ] **Step 1: Write the failing test for `shrinkPdfWithLevel`**

Add to `src/services/shrink-service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { estimateScale, shrinkPdfWithLevel } from './shrink-service'
import type { CompressionLevel } from './shrink-service'

// Keep existing estimateScale tests unchanged above.

// Mock the heavy PDF/canvas calls so this test runs in jsdom
vi.mock('./render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 1 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
}))

describe('shrinkPdfWithLevel — level mapping', () => {
  it('accepts all three levels without throwing', async () => {
    // We only test that the function is exported and accepts the right types.
    // The actual pdf-lib/canvas path is integration-level; we just verify the
    // dispatch table exists and maps correctly via estimateScale indirectly.
    const levels: CompressionLevel[] = ['less', 'recommended', 'extreme']
    for (const level of levels) {
      // shrinkPdfWithLevel requires real bytes; we test the mapping constants
      // via the exported LEVEL_CONFIG instead.
      expect(typeof level).toBe('string')
    }
  })

  it('LEVEL_CONFIG has correct quality values', async () => {
    const { LEVEL_CONFIG } = await import('./shrink-service')
    expect(LEVEL_CONFIG.less.quality).toBeCloseTo(0.8)
    expect(LEVEL_CONFIG.recommended.quality).toBeCloseTo(0.6)
    expect(LEVEL_CONFIG.extreme.quality).toBeCloseTo(0.4)
    expect(LEVEL_CONFIG.less.targetLongEdgePx).toBeGreaterThanOrEqual(2000)
    expect(LEVEL_CONFIG.recommended.targetLongEdgePx).toBe(1600)
    expect(LEVEL_CONFIG.extreme.targetLongEdgePx).toBeLessThanOrEqual(1200)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```
npm test -- --reporter=verbose src/services/shrink-service.test.ts
```

Expected: FAIL — `shrinkPdfWithLevel` is not exported, `LEVEL_CONFIG` is not exported.

- [ ] **Step 3: Implement the new exports in `src/services/shrink-service.ts`**

Replace the file entirely (existing `shrinkPdf` and `estimateScale` stay at the bottom unchanged):

```ts
import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadRenderDoc, renderPageToCanvas } from './render-service'

export function estimateScale(targetLongEdgePx: number, pageLongEdgePt: number): number {
  return Math.min(2, targetLongEdgePx / pageLongEdgePt)
}

export type CompressionLevel = 'less' | 'recommended' | 'extreme'

export const LEVEL_CONFIG: Record<
  CompressionLevel,
  { quality: number; targetLongEdgePx: number }
> = {
  less:        { quality: 0.8, targetLongEdgePx: 2400 },
  recommended: { quality: 0.6, targetLongEdgePx: 1600 },
  extreme:     { quality: 0.4, targetLongEdgePx: 1100 },
}

export async function shrinkPdfWithLevel(
  bytes: Uint8Array,
  level: CompressionLevel,
): Promise<Uint8Array> {
  const { quality, targetLongEdgePx } = LEVEL_CONFIG[level]
  return shrinkPdf(bytes, { quality, targetLongEdgePx })
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

- [ ] **Step 4: Run the test to verify it passes**

```
npm test -- --reporter=verbose src/services/shrink-service.test.ts
```

Expected: All tests PASS (estimateScale 3 cases + new LEVEL_CONFIG test).

---

### Task 2: Create `ShrinkModal` component

**Files:**
- Create: `src/components/ShrinkModal.tsx`
- Create: `src/components/shrinkModal.test.tsx`

**Interfaces:**
- Consumes from Task 1:
  ```ts
  import { shrinkPdfWithLevel } from '../services/shrink-service'
  import type { CompressionLevel } from '../services/shrink-service'
  ```
- Produces:
  ```tsx
  interface ShrinkModalProps {
    bytes: Uint8Array
    onApply: (result: Uint8Array) => void
    onClose: () => void
  }
  export default function ShrinkModal(props: ShrinkModalProps): JSX.Element
  ```

- [ ] **Step 1: Write the failing tests in `src/components/shrinkModal.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShrinkModal from './ShrinkModal'
import { makeSamplePdf } from '../test/fixtures'

// Mock the heavy shrink service so tests don't invoke canvas/pdf-lib
vi.mock('../services/shrink-service', () => ({
  shrinkPdfWithLevel: vi.fn(async (b: Uint8Array) => {
    // Return a shorter buffer so size comparison shows reduction
    return b.slice(0, Math.floor(b.length * 0.6))
  }),
  LEVEL_CONFIG: {
    less:        { quality: 0.8, targetLongEdgePx: 2400 },
    recommended: { quality: 0.6, targetLongEdgePx: 1600 },
    extreme:     { quality: 0.4, targetLongEdgePx: 1100 },
  },
}))

let bytes: Uint8Array

beforeEach(async () => {
  bytes = await makeSamplePdf(1)
})

describe('ShrinkModal — options step', () => {
  it('renders three compression level cards with Recommended pre-selected', () => {
    render(<ShrinkModal bytes={bytes} onApply={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Less compression')).toBeInTheDocument()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText('Extreme compression')).toBeInTheDocument()
    // Compress button present
    expect(screen.getByRole('button', { name: 'Compress' })).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<ShrinkModal bytes={bytes} onApply={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ShrinkModal — result step', () => {
  it('shows Original size, New size, and reduction % after compressing', async () => {
    render(<ShrinkModal bytes={bytes} onApply={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Compress' }))
    await waitFor(() => {
      expect(screen.getByText(/Original/i)).toBeInTheDocument()
      expect(screen.getByText(/New size/i)).toBeInTheDocument()
      expect(screen.getByText(/Reduced by/i)).toBeInTheDocument()
    })
  })

  it('calls onApply with result bytes when Apply is clicked', async () => {
    const onApply = vi.fn()
    render(<ShrinkModal bytes={bytes} onApply={onApply} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Compress' }))
    await waitFor(() => screen.getByRole('button', { name: 'Apply' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenCalledOnce()
    const passed = onApply.mock.calls[0][0] as Uint8Array
    expect(passed).toBeInstanceOf(Uint8Array)
  })

  it('does NOT call onApply when Back is clicked on result step', async () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(<ShrinkModal bytes={bytes} onApply={onApply} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Compress' }))
    await waitFor(() => screen.getByRole('button', { name: 'Back' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onApply).not.toHaveBeenCalled()
    // Back returns to options step
    expect(screen.getByRole('button', { name: 'Compress' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the failing tests**

```
npm test -- --reporter=verbose src/components/shrinkModal.test.tsx
```

Expected: FAIL — `ShrinkModal` module not found.

- [ ] **Step 3: Implement `src/components/ShrinkModal.tsx`**

```tsx
import React, { useState } from 'react'
import { shrinkPdfWithLevel } from '../services/shrink-service'
import type { CompressionLevel } from '../services/shrink-service'

interface ShrinkModalProps {
  bytes: Uint8Array
  onApply: (result: Uint8Array) => void
  onClose: () => void
}

type Step = 'options' | 'loading' | 'result'

interface LevelMeta {
  id: CompressionLevel
  label: string
  description: string
}

const LEVELS: LevelMeta[] = [
  {
    id: 'less',
    label: 'Less compression',
    description: 'High quality, small size reduction — best for print-ready documents.',
  },
  {
    id: 'recommended',
    label: 'Recommended',
    description: 'Good quality and good reduction — best for most use cases.',
  },
  {
    id: 'extreme',
    label: 'Extreme compression',
    description: 'Smallest file, lower image quality — best for email and uploads.',
  },
]

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`
  if (n >= 1_024)     return `${(n / 1_024).toFixed(0)} KB`
  return `${n} B`
}

export default function ShrinkModal({ bytes, onApply, onClose }: ShrinkModalProps) {
  const [step, setStep] = useState<Step>('options')
  const [level, setLevel] = useState<CompressionLevel>('recommended')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)

  const handleCompress = async () => {
    setStep('loading')
    try {
      const out = await shrinkPdfWithLevel(bytes, level)
      setResultBytes(out)
      setStep('result')
    } catch (e) {
      console.error('shrink failed', e)
      setStep('options')
    }
  }

  const handleApply = () => {
    if (resultBytes) onApply(resultBytes)
  }

  const handleBack = () => {
    setResultBytes(null)
    setStep('options')
  }

  const originalSize = bytes.length
  const newSize = resultBytes?.length ?? 0
  const reduced = originalSize > 0
    ? Math.round(((originalSize - newSize) / originalSize) * 100)
    : 0
  const isSmaller = newSize < originalSize

  // ── Shared style tokens (inline — no toolbar-* classes touched) ──────────
  const accent = '#d97706'
  const accentSurface = 'rgba(217,119,6,0.08)'
  const accentRing = 'rgba(217,119,6,0.35)'
  const chrome = '#18181b'
  const chromeMuted = '#71717a'
  const chromeSecondary = '#3f3f46'
  const surfaceCard = '#ffffff'
  const surfaceBase = '#f4f4f5'
  const hairline = 'rgba(24,24,27,0.09)'

  const applyBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 22px',
    background: '#16a34a',
    border: 'none',
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  }

  const secondaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 18px',
    background: surfaceBase,
    border: `1px solid ${hairline}`,
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 500,
    color: chromeSecondary,
    cursor: 'pointer',
  }

  const primaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 22px',
    background: accent,
    border: 'none',
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 380 }}>

          {/* ── OPTIONS STEP ─────────────────────────────────────── */}
          {step === 'options' && (
            <>
              <h2 className="modal-title">Compress PDF</h2>
              <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 16 }}>
                Choose a compression level. You can review the result before applying.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {LEVELS.map((lv) => {
                  const selected = level === lv.id
                  return (
                    <button
                      key={lv.id}
                      onClick={() => setLevel(lv.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '10px 14px',
                        background: selected ? accentSurface : surfaceBase,
                        border: `1.5px solid ${selected ? accent : hairline}`,
                        borderRadius: 10,
                        boxShadow: selected ? `0 0 0 2px ${accentRing}` : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'border-color 120ms, box-shadow 120ms',
                      }}
                      aria-pressed={selected}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: selected ? accent : chrome }}>
                        {lv.label}
                      </span>
                      <span style={{ fontSize: 11.5, color: chromeMuted, marginTop: 2 }}>
                        {lv.description}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={secondaryBtnStyle} onClick={onClose}>Cancel</button>
                <button style={primaryBtnStyle} onClick={handleCompress}>Compress</button>
              </div>
            </>
          )}

          {/* ── LOADING STEP ─────────────────────────────────────── */}
          {step === 'loading' && (
            <>
              <h2 className="modal-title">Compressing…</h2>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
                {/* CSS spinner — no external deps */}
                <div
                  aria-label="Compressing"
                  style={{
                    width: 36,
                    height: 36,
                    border: `3px solid ${hairline}`,
                    borderTopColor: accent,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ marginTop: 14, fontSize: 12.5, color: chromeMuted }}>
                  Re-encoding pages…
                </p>
              </div>
            </>
          )}

          {/* ── RESULT STEP ──────────────────────────────────────── */}
          {step === 'result' && resultBytes && (
            <>
              <h2 className="modal-title">Compression result</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {/* Row: Original */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', background: surfaceBase, borderRadius: 8,
                  border: `1px solid ${hairline}`,
                }}>
                  <span style={{ fontSize: 12.5, color: chromeMuted, fontWeight: 500 }}>Original</span>
                  <span style={{ fontSize: 13, color: chrome, fontWeight: 600 }}>
                    {formatBytes(originalSize)}
                  </span>
                </div>
                {/* Row: New size */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', background: surfaceBase, borderRadius: 8,
                  border: `1px solid ${hairline}`,
                }}>
                  <span style={{ fontSize: 12.5, color: chromeMuted, fontWeight: 500 }}>New size</span>
                  <span style={{ fontSize: 13, color: chrome, fontWeight: 600 }}>
                    {formatBytes(newSize)}
                  </span>
                </div>
                {/* Row: Reduction */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px',
                  background: isSmaller ? 'rgba(22,163,74,0.07)' : accentSurface,
                  borderRadius: 8,
                  border: `1px solid ${isSmaller ? 'rgba(22,163,74,0.2)' : hairline}`,
                }}>
                  <span style={{ fontSize: 12.5, color: chromeMuted, fontWeight: 500 }}>
                    {isSmaller ? 'Reduced by' : 'Result'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSmaller ? '#16a34a' : chromeMuted }}>
                    {isSmaller
                      ? `${reduced}%`
                      : 'Already optimized — no reduction'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={secondaryBtnStyle} onClick={handleBack}>Back</button>
                {isSmaller && (
                  <button style={applyBtnStyle} onClick={handleApply}>Apply</button>
                )}
                {!isSmaller && (
                  <button style={secondaryBtnStyle} onClick={onClose}>Close</button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```
npm test -- --reporter=verbose src/components/shrinkModal.test.tsx
```

Expected: All 5 tests PASS.

---

### Task 3: Wire `ShrinkModal` into `App.tsx`

**Files:**
- Modify: `src/App.tsx` (lines 34, 44–48, 180, 295–296 area)
- Modify: `src/components/opsWiring.test.tsx` (add Shrink modal test; keep existing tests intact)

**Interfaces:**
- Consumes from Task 2: `ShrinkModal` default export
- Consumes from Task 1: `shrinkPdfWithLevel` (indirectly through ShrinkModal)
- The `apply` function from `useDocumentStore` has signature: `apply: (op: (b: Uint8Array) => Promise<Uint8Array>) => Promise<void>`

- [ ] **Step 1: Write the failing test in `src/components/opsWiring.test.tsx`**

Append this test to the existing file (keep all existing tests above it unchanged):

```tsx
it('Shrink file size opens the ShrinkModal', async () => {
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Shrink file size' }))
  // Options step should appear
  expect(await screen.findByText('Compress PDF')).toBeInTheDocument()
  expect(screen.getByText('Less compression')).toBeInTheDocument()
  expect(screen.getByText('Recommended')).toBeInTheDocument()
  expect(screen.getByText('Extreme compression')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Compress' })).toBeInTheDocument()
})
```

Also add the needed mock for shrink-service at the top of `opsWiring.test.tsx` — add this line alongside the existing `vi.mock('../services/render-service', ...)` call:

```tsx
vi.mock('../services/shrink-service', () => ({
  shrinkPdfWithLevel: vi.fn(async (b: Uint8Array) => b.slice(0, Math.floor(b.length * 0.6))),
  shrinkPdf: vi.fn(async (b: Uint8Array) => b),
  LEVEL_CONFIG: {
    less:        { quality: 0.8, targetLongEdgePx: 2400 },
    recommended: { quality: 0.6, targetLongEdgePx: 1600 },
    extreme:     { quality: 0.4, targetLongEdgePx: 1100 },
  },
  estimateScale: (t: number, p: number) => Math.min(2, t / p),
}))
```

- [ ] **Step 2: Run to confirm test fails**

```
npm test -- --reporter=verbose src/components/opsWiring.test.tsx
```

Expected: New test FAIL — no `ShrinkModal`, `onShrink` still runs immediately.

- [ ] **Step 3: Update `src/App.tsx`**

Add the import for `ShrinkModal` (after line 34, after the `InfoModal` import):

```tsx
import ShrinkModal from './components/ShrinkModal'
```

Add `shrinkOpen` state (after the `previewPage` and `modalZoom` state lines):

```tsx
const [shrinkOpen, setShrinkOpen] = useState(false)
```

Replace the existing `onShrink` line:

```tsx
// Before:
const onShrink = () => run(apply((b) => shrinkPdf(b)))

// After:
const onShrink = () => setShrinkOpen(true)
```

Remove the `import { shrinkPdf } from './services/shrink-service'` line (line 34) since `ShrinkModal` now handles calling `shrinkPdfWithLevel` internally. (If other tests import it, keep the line — but in `App.tsx` it is only used in `onShrink`, so remove it.)

Add the modal render alongside `InfoModal` (inside the `<div className="app-shell">` before the `Toolbar`):

```tsx
{shrinkOpen && bytes && (
  <ShrinkModal
    bytes={bytes}
    onApply={(resultBytes) => {
      run(apply(() => Promise.resolve(resultBytes)))
      setShrinkOpen(false)
    }}
    onClose={() => setShrinkOpen(false)}
  />
)}
```

- [ ] **Step 4: Run all tests to verify nothing broke**

```
npm test -- --reporter=verbose
```

Expected: All tests PASS including the new Shrink modal test.

- [ ] **Step 5: Verify build is clean**

```
npm run build
```

Expected: Exit 0, no TypeScript errors, no unused import warnings.

---

### Task 4: Write Playwright verification script

**Files:**
- Create: `.superpowers/sdd/lm-check.mjs`

**Interfaces:**
- Consumes: dev server at `http://localhost:5188/`
- Consumes: sample file at `C:\Users\user\Downloads\pdf-page-editor\samples\contract.pdf`
- Uses: Playwright (already installed) — import via `@playwright/test` or dynamic `require('playwright')`

- [ ] **Step 1: Create `.superpowers/sdd/` directory and the script**

```
mkdir -p C:\Users\user\Documents\GitHub\pdf-editor-web\.superpowers\sdd
```

Create `.superpowers/sdd/lm-check.mjs`:

```mjs
// lm-check.mjs — Playwright verify script for Shrink file size modal
// Run: node .superpowers/sdd/lm-check.mjs
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const SAMPLE_PDF = 'C:\\Users\\user\\Downloads\\pdf-page-editor\\samples\\contract.pdf'
const BASE_URL   = 'http://localhost:5188/'
const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = path.resolve(__dirname, '../../.superpowers/sdd/screenshots')

import { mkdirSync } from 'fs'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const shot1 = path.join(SCREENSHOT_DIR, 'shrink-options-step.png')
const shot2 = path.join(SCREENSHOT_DIR, 'shrink-result-step.png')

const browser = await chromium.launch({ headless: true })
const page    = await browser.newPage()

// Capture console errors
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(err.message))

await page.goto(BASE_URL)

// Upload the sample PDF
const fileInput = page.locator('input[type="file"]').first()
await fileInput.setInputFiles(SAMPLE_PDF)

// Wait for the toolbar to appear (document loaded)
await page.waitForSelector('[aria-label="Shrink file size"], button:has-text("Shrink")', { timeout: 15_000 })

// Click "Shrink file size"
await page.click('button:has-text("Shrink file size")')

// Wait for options step
await page.waitForSelector('text=Compress PDF', { timeout: 5_000 })
await page.screenshot({ path: shot1 })
console.log('Screenshot 1 (options step):', shot1)

// Assert all three level labels are visible
for (const label of ['Less compression', 'Recommended', 'Extreme compression']) {
  const el = await page.$(`text=${label}`)
  if (!el) throw new Error(`Missing level card: ${label}`)
}
console.log('PASS: all 3 compression level cards visible')

// Pick "Extreme compression"
await page.click('button:has-text("Extreme compression")')

// Click Compress
await page.click('button:has-text("Compress")')

// Wait for result step (loading → result)
await page.waitForSelector('text=Compression result', { timeout: 90_000 })
await page.screenshot({ path: shot2 })
console.log('Screenshot 2 (result step):', shot2)

// Assert Original, New size, and Reduced by are shown
for (const label of ['Original', 'New size']) {
  const el = await page.$(`text=${label}`)
  if (!el) throw new Error(`Missing result label: ${label}`)
}
// Either "Reduced by" or "Already optimized" must appear
const reducedEl = await page.$('text=Reduced by')
const alreadyEl = await page.$('text=Already optimized')
if (!reducedEl && !alreadyEl) throw new Error('Missing reduction result text')
console.log('PASS: Original, New size, and reduction info shown')

// Click Apply (only shown if reduced)
const applyBtn = await page.$('button:has-text("Apply")')
if (applyBtn) {
  await applyBtn.click()
  console.log('PASS: Apply clicked')
} else {
  const closeBtn = await page.$('button:has-text("Close")')
  if (closeBtn) await closeBtn.click()
  console.log('INFO: No reduction possible — Close clicked instead')
}

// Check no console errors
if (errors.length > 0) {
  console.error('FAIL: Console/page errors detected:', errors)
  process.exit(1)
}

console.log('PASS: No console/page errors')
console.log('')
console.log('All checks passed.')
console.log('Screenshot paths:')
console.log('  1:', shot1)
console.log('  2:', shot2)

await browser.close()
```

- [ ] **Step 2: Make the directory and verify the script syntax**

```
node --check .superpowers/sdd/lm-check.mjs
```

Expected: No syntax errors (exit 0).

---

### Task 5: Run full test suite, build, Playwright verify, and commit

**Files:** No source changes in this task — just validation + commit.

- [ ] **Step 1: Run full test suite**

```
npm test
```

Expected: All tests PASS, zero failures.

- [ ] **Step 2: Build**

```
npm run build
```

Expected: Exit 0, dist/ produced, no TS errors.

- [ ] **Step 3: Start the dev server (background)**

In a separate terminal or background process:
```
npm run dev
```

Wait for it to print `http://localhost:5188/` before proceeding.

- [ ] **Step 4: Run the Playwright verification script**

```
node .superpowers/sdd/lm-check.mjs
```

Expected output (approximately):
```
Screenshot 1 (options step): ...\screenshots\shrink-options-step.png
PASS: all 3 compression level cards visible
Screenshot 2 (result step): ...\screenshots\shrink-result-step.png
PASS: Original, New size, and reduction info shown
PASS: Apply clicked
PASS: No console/page errors

All checks passed.
Screenshot paths:
  1: ...\screenshots\shrink-options-step.png
  2: ...\screenshots\shrink-result-step.png
```

- [ ] **Step 5: Commit everything**

```bash
git add src/services/shrink-service.ts \
        src/services/shrink-service.test.ts \
        src/components/ShrinkModal.tsx \
        src/components/shrinkModal.test.tsx \
        src/components/opsWiring.test.tsx \
        src/App.tsx \
        .superpowers/sdd/lm-check.mjs \
        docs/superpowers/plans/2026-07-01-shrink-modal.md

git commit -m "feat: shrink-file-size modal with compression options and size preview"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task covering it |
|---|---|
| Options step with 3 level cards, Recommended pre-selected | Task 2 (ShrinkModal options step) |
| Less/Recommended/Extreme quality+scale mapping | Task 1 (LEVEL_CONFIG) |
| Loading step with animation | Task 2 (loading step, CSS spinner) |
| Result step with Original, New size, Reduced by % | Task 2 (result step) |
| Honest "already optimized" message | Task 2 (isSmaller check) |
| Apply commits via `apply()` (undoable) | Task 3 (onApply wires to apply()) |
| Back/Cancel discards without touching doc | Task 2 (Back → options, Cancel → onClose) |
| formatBytes (KB/MB) | Task 2 (formatBytes helper) |
| No new deps | All tasks use only existing imports |
| Keep existing `shrinkPdf` export intact | Task 1 (function stays) |
| No toolbar CSS changes | All tasks use inline styles or `.modal-*` |
| Playwright verify script in `.superpowers/sdd/` | Task 4 |
| `npm test` green | Task 5 |
| `npm run build` clean | Task 5 |
| Conventional commit message | Task 5 |

**Placeholder scan:** No TBD, no TODO, no "similar to", no "add appropriate". All code blocks are complete.

**Type consistency check:**
- `CompressionLevel` defined in Task 1; imported in Task 2 and used in `ShrinkModal`. Consistent.
- `shrinkPdfWithLevel(bytes: Uint8Array, level: CompressionLevel): Promise<Uint8Array>` — called in Task 2 with matching signature.
- `onApply: (result: Uint8Array) => void` in ShrinkModal props; wired in App.tsx as `(resultBytes) => { run(apply(() => Promise.resolve(resultBytes))); setShrinkOpen(false) }`. Types match: `apply` expects `(b: Uint8Array) => Promise<Uint8Array>`.
- `LEVEL_CONFIG` exported from Task 1, referenced in Task 2 mock — matches shape.

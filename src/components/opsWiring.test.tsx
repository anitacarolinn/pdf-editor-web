import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'
import { PDFDocument } from 'pdf-lib'
import { getPageCount } from '../services/page-ops'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 2 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

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

beforeEach(async () => {
  const bytes = await makeSamplePdf(2)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

afterEach(() => vi.restoreAllMocks())

it('Rotate (per-card hover) rotates the page', async () => {
  render(<App />)
  // Rotation lives on the per-card hover toolbar (removed from the main toolbar).
  const rotateBtns = await screen.findAllByRole('button', { name: 'Rotate page' })
  await userEvent.click(rotateBtns[0])
  await waitFor(async () => {
    const doc = await PDFDocument.load(useDocumentStore.getState().bytes!)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
  }, { timeout: 5000 })
})

it('Page # adds numbers without changing page count', async () => {
  render(<App />)
  const before = useDocumentStore.getState().bytes!
  const beforeCount = await getPageCount(before)
  await userEvent.click(await screen.findByRole('button', { name: 'Numbers' }))
  await waitFor(async () => {
    const after = useDocumentStore.getState().bytes!
    expect(after).not.toBe(before)
    expect(await getPageCount(after)).toBe(beforeCount)
  })
})

it('Watermark opens the WatermarkModal', async () => {
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Watermark' }))
  // Modal should open with the "Add Watermark" heading
  expect(await screen.findByText('Add Watermark')).toBeInTheDocument()
  // Both mode buttons should be visible
  expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument()
})

it('Shrink file size opens the ShrinkModal', async () => {
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Shrink' }))
  // Options step should appear
  expect(await screen.findByText('Compress PDF')).toBeInTheDocument()
  expect(screen.getByText('Less compression')).toBeInTheDocument()
  expect(screen.getByText('Recommended')).toBeInTheDocument()
  expect(screen.getByText('Extreme compression')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Compress' })).toBeInTheDocument()
})

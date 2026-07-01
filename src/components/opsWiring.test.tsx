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

beforeEach(async () => {
  const bytes = await makeSamplePdf(2)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

afterEach(() => vi.restoreAllMocks())

it('Rotate R rotates the selected page', async () => {
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Rotate R' }))
  await waitFor(async () => {
    const doc = await PDFDocument.load(useDocumentStore.getState().bytes!)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
  })
})

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

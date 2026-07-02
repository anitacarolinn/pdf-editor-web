import { it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 1 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(1)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

it('Export downloads a PDF (no format options — PDF only)', async () => {
  const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
  globalThis.URL.revokeObjectURL = vi.fn()
  render(<App />)
  // The format selector has been removed — export is always PDF.
  expect(screen.queryByTestId('export-format')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Export' }))
  // Export opens a rename dialog; confirm with Download.
  await userEvent.click(await screen.findByRole('button', { name: 'Download' }))
  await waitFor(() => expect(spy).toHaveBeenCalled())
  spy.mockRestore()
})

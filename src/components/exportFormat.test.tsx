import { it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useDocumentStore } from './services/document-store'
import { makeSamplePdf } from './test/fixtures'

vi.mock('./services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 1 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(() => {
  useDocumentStore.setState({ bytes: null, fileName: null, past: [], future: [] })
})

describe('App shell', () => {
  it('shows an empty state when no document is loaded', () => {
    render(<App />)
    expect(screen.getByText('PDF · PNG · JPG')).toBeInTheDocument()
  })
})

it('Download triggers export of the working bytes', async () => {
  const spy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = vi.fn()
  const bytes = await makeSamplePdf(1)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
  render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: 'Export' }))
  expect(spy).toHaveBeenCalledOnce()
  spy.mockRestore()
})

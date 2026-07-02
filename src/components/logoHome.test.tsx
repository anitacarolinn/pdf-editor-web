import { it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 2 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
  isPdfEncrypted: vi.fn(async () => false),
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(2)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

it('clicking the brand/logo returns to the landing without crashing', async () => {
  render(<App />)
  // A document is open → toolbar (banner) is present.
  await screen.findByRole('banner')
  const home = await screen.findByRole('button', { name: 'Back to start' })

  await userEvent.click(home)

  // Should return to the landing: toolbar gone, drop zone shown.
  await waitFor(() => {
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'PDF drop zone' })).toBeInTheDocument()
  })
})

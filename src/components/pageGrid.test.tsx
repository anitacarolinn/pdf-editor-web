import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 3 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(3)
  useDocumentStore.setState({ bytes, fileName: 'test.pdf', past: [], future: [] })
})

describe('PageGrid', () => {
  it('renders one thumb card per page with data-testid="thumb"', async () => {
    render(<App />)
    const thumbs = await screen.findAllByTestId('thumb')
    expect(thumbs).toHaveLength(3)
  })

  it('renders "page 1" label text on the first card', async () => {
    render(<App />)
    await screen.findAllByTestId('thumb')
    expect(screen.getByText('page 1')).toBeInTheDocument()
  })
})

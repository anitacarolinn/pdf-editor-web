import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

describe('multi-select', () => {
  it('ctrl-click adds pages to the selection count', async () => {
    const user = userEvent.setup()
    render(<App />)
    const thumbs = await screen.findAllByTestId('thumb')
    await user.click(thumbs[0])
    await user.keyboard('{Control>}')
    await user.click(thumbs[2])
    await user.keyboard('{/Control}')
    expect(screen.getByTestId('selection-count').textContent).toContain('2')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

// jsdom has no canvas 2d; stub the raster render so wiring can be tested
vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 2 })),
  renderPageToCanvas: vi.fn(async () => {}),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(() => {
  useDocumentStore.setState({ bytes: null, fileName: null, past: [], future: [] })
})

describe('open flow', () => {
  it('loads a chosen file and leaves the empty state', async () => {
    render(<App />)
    const bytes = await makeSamplePdf(2)
    const file = new File([bytes.buffer as ArrayBuffer], 'sample.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, file)
    await waitFor(() =>
      expect(screen.queryByText('Open a PDF to get started')).not.toBeInTheDocument(),
    )
  })
})

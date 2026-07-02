import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf, getPageCount } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 3 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(3)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

describe('page operations', () => {
  it('Delete reduces the page count of the working document', async () => {
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(async () => {
      const bytes = useDocumentStore.getState().bytes!
      expect(await getPageCount(bytes)).toBe(2)
    })
  })

  it('Undo restores the page count', async () => {
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => {
      const bytes = useDocumentStore.getState().bytes!
      expect(await getPageCount(bytes)).toBe(3)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { useOverlayStore } from '../services/overlay-store'
import { makeSamplePdf } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 1 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(() => {
  useDocumentStore.setState({ bytes: null, fileName: null, past: [], future: [] })
  useOverlayStore.getState().clear()
})

// Helper: open the modal for page 0 so Add text / Add picture / Apply are rendered
async function openModal() {
  // Find the first hover "Preview page" button on the first thumb card
  const previewBtns = await screen.findAllByRole('button', { name: 'Preview page' })
  await userEvent.click(previewBtns[0])
}

describe('Apply overlay', () => {
  it('Apply button is disabled when there are no overlay objects', async () => {
    const bytes = await makeSamplePdf(1)
    useDocumentStore.setState({ bytes, fileName: 'test.pdf', past: [], future: [] })
    render(<App />)
    await openModal()
    const applyBtn = await screen.findByRole('button', { name: /apply/i })
    expect(applyBtn).toBeDisabled()
  })

  it('Apply is non-destructive: closes the modal but KEEPS objects editable', async () => {
    const bytes = await makeSamplePdf(1)
    useDocumentStore.setState({ bytes, fileName: 'test.pdf', past: [], future: [] })
    render(<App />)
    await openModal()

    // Add a text object via the store directly
    act(() => {
      useOverlayStore.getState().addText(0)
    })
    expect(useOverlayStore.getState().objects).toHaveLength(1)

    // Apply button should now be enabled
    const applyBtn = await screen.findByRole('button', { name: /apply/i })
    await waitFor(() => expect(applyBtn).not.toBeDisabled())

    // Click Apply → modal closes
    await userEvent.click(applyBtn)
    await waitFor(() => {
      expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument()
    })

    // Objects PERSIST (editable layer) — NOT cleared, NOT baked into the doc
    expect(useOverlayStore.getState().objects).toHaveLength(1)
    // Working document bytes unchanged (baking happens only at Download)
    expect(useDocumentStore.getState().bytes).toEqual(bytes)
    expect(useDocumentStore.getState().past).toHaveLength(0)
  })

  it('onOpen clears the overlay store', async () => {
    // Seed with a text object before rendering
    useOverlayStore.getState().addText(0)
    expect(useOverlayStore.getState().objects).toHaveLength(1)

    render(<App />)

    // Upload a PDF via the Open file input (first input[type=file] in the toolbar)
    const bytes = await makeSamplePdf(1)
    const file = new File([bytes.buffer as ArrayBuffer], 'sample.pdf', { type: 'application/pdf' })
    const openInput = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(openInput, file)

    // App.onOpen calls load() then clear() — overlay must be empty
    await waitFor(() => {
      expect(useOverlayStore.getState().objects).toHaveLength(0)
    })
  })
})

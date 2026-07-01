import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { useOverlayStore } from '../services/overlay-store'
import { makeSamplePdf, getPageCount } from '../test/fixtures'

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

  it('Apply flattens overlay objects into the document and clears them', async () => {
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

    // Click Apply
    await userEvent.click(applyBtn)

    // Overlay store should be cleared
    await waitFor(() => {
      expect(useOverlayStore.getState().objects).toHaveLength(0)
    })

    // Document bytes should have changed (flatten added content)
    const newBytes = useDocumentStore.getState().bytes!
    expect(newBytes).not.toEqual(bytes)

    // Page count should be preserved
    expect(await getPageCount(newBytes)).toBe(1)

    // History should have a past entry (apply was undoable)
    expect(useDocumentStore.getState().past).toHaveLength(1)
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

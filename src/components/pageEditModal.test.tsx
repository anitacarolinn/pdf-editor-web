import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageEditModal from './PageEditModal'
import { useOverlayStore } from '../services/overlay-store'

// Mock render-service so PageCanvas doesn't try to load pdf.js
vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 3 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

// Minimal mock PDFDocumentProxy
const mockDoc = {
  numPages: 3,
  getPage: vi.fn(async () => ({
    getViewport: () => ({ width: 595, height: 842 }),
    render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    cleanup: vi.fn(),
  })),
} as unknown as import('pdfjs-dist').PDFDocumentProxy

beforeEach(() => {
  useOverlayStore.getState().clear()
})

describe('PageEditModal', () => {
  it('renders the modal with Close, Add text, Add picture buttons', () => {
    render(
      <PageEditModal
        page={0}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={vi.fn()}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add text' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add picture' })).toBeInTheDocument()
  })

  it('fires onClose when the Close (X) button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <PageEditModal
        page={0}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={onClose}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onClose when pressing Escape', async () => {
    const onClose = vi.fn()
    render(
      <PageEditModal
        page={0}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={onClose}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onClose when clicking the backdrop', async () => {
    const onClose = vi.fn()
    render(
      <PageEditModal
        page={0}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={onClose}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    const backdrop = document.querySelector('[data-testid="modal-backdrop"]') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onGo with a 1-based page number when typing in the page input', async () => {
    const onGo = vi.fn()
    render(
      <PageEditModal
        page={0}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={onGo}
        onClose={vi.fn()}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    const input = screen.getByRole('spinbutton', { name: 'Current page' })
    await userEvent.clear(input)
    await userEvent.type(input, '2{Enter}')
    expect(onGo).toHaveBeenCalledWith(2)
  })

  it('fires onAddText when the Add text button is clicked', async () => {
    const onAddText = vi.fn()
    render(
      <PageEditModal
        page={0}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={vi.fn()}
        onAddText={onAddText}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add text' }))
    expect(onAddText).toHaveBeenCalledOnce()
  })

  it('renders the Apply button', () => {
    render(
      <PageEditModal
        page={0}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={vi.fn()}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })

  it('shows "Page n / M" indicator in the bottom bar', () => {
    render(
      <PageEditModal
        page={1}
        pageCount={5}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={vi.fn()}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    // page prop is 0-based, so page=1 means "Page 2"
    expect(screen.getByText('/ 5')).toBeInTheDocument()
  })

  it('renders Previous page and Next page navigation buttons', () => {
    render(
      <PageEditModal
        page={1}
        pageCount={3}
        doc={mockDoc}
        zoom={1}
        onZoom={vi.fn()}
        onGo={vi.fn()}
        onClose={vi.fn()}
        onAddText={vi.fn()}
        onAddPicture={vi.fn()}
        onApply={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
  })
})

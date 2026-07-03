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

// Mock text-service so the mount-time text layer doesn't load pdf.js (DOMMatrix)
vi.mock('../services/text-service', () => ({
  renderTextLayer: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  searchDocument: vi.fn().mockResolvedValue([]),
  extractDocumentText: vi.fn().mockResolvedValue(''),
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

const defaultProps = {
  page: 0,
  pageCount: 3,
  doc: mockDoc,
  zoom: 1,
  onZoom: vi.fn(),
  onGo: vi.fn(),
  onClose: vi.fn(),
  onAddText: vi.fn(),
  onAddPicture: vi.fn(),
  onSign: vi.fn(),
  onApply: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: false,
  canRedo: false,
  onInsert: vi.fn(),
  onDeletePage: vi.fn(),
  onDuplicate: vi.fn(),
  onRotateL: vi.fn(),
  onRotateR: vi.fn(),
  onMoveBefore: vi.fn(),
  onMoveAfter: vi.fn(),
}

beforeEach(() => {
  useOverlayStore.getState().clear()
})

describe('PageEditModal', () => {
  it('renders the modal with Cancel, Add text, Add picture buttons', () => {
    render(<PageEditModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add text' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add picture' })).toBeInTheDocument()
  })

  it('fires onClose when the Cancel button is clicked', async () => {
    const onClose = vi.fn()
    render(<PageEditModal {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onClose when pressing Escape', async () => {
    const onClose = vi.fn()
    render(<PageEditModal {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onClose when clicking the backdrop', async () => {
    const onClose = vi.fn()
    render(<PageEditModal {...defaultProps} onClose={onClose} />)
    const backdrop = document.querySelector('[data-testid="modal-backdrop"]') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onGo with a 1-based page number when typing in the page input', async () => {
    const onGo = vi.fn()
    render(<PageEditModal {...defaultProps} onGo={onGo} />)
    const input = screen.getByRole('spinbutton', { name: 'Current page' })
    await userEvent.clear(input)
    await userEvent.type(input, '2{Enter}')
    expect(onGo).toHaveBeenCalledWith(2)
  })

  it('fires onAddText when the Add text button is clicked', async () => {
    const onAddText = vi.fn()
    render(<PageEditModal {...defaultProps} onAddText={onAddText} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add text' }))
    expect(onAddText).toHaveBeenCalledOnce()
  })

  it('renders the Save & Close button', () => {
    render(<PageEditModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Save & Close' })).toBeInTheDocument()
  })

  it('shows "Page n / M" indicator in the bottom bar', () => {
    render(<PageEditModal {...defaultProps} page={1} pageCount={5} />)
    // page prop is 0-based, so page=1 means "Page 2"
    expect(screen.getByText('/ 5')).toBeInTheDocument()
  })

  it('renders Previous page and Next page navigation buttons', () => {
    render(<PageEditModal {...defaultProps} page={1} pageCount={3} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
  })

  it('renders the Restore button', () => {
    render(<PageEditModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
  })

  it('fires onApply when the Save & Close button is clicked', async () => {
    const onApply = vi.fn()
    render(<PageEditModal {...defaultProps} onApply={onApply} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save & Close' }))
    expect(onApply).toHaveBeenCalledOnce()
  })
})

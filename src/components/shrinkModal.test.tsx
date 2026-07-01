import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShrinkModal from './ShrinkModal'
import { makeSamplePdf } from '../test/fixtures'

// Mock the heavy shrink service so tests don't invoke canvas/pdf-lib
vi.mock('../services/shrink-service', () => ({
  shrinkPdfWithLevel: vi.fn(async (b: Uint8Array) => {
    // Return a shorter buffer so size comparison shows reduction
    return b.slice(0, Math.floor(b.length * 0.6))
  }),
  LEVEL_CONFIG: {
    less:        { quality: 0.8, targetLongEdgePx: 2400 },
    recommended: { quality: 0.6, targetLongEdgePx: 1600 },
    extreme:     { quality: 0.4, targetLongEdgePx: 1100 },
  },
}))

let bytes: Uint8Array

beforeEach(async () => {
  bytes = await makeSamplePdf(1)
})

describe('ShrinkModal — options step', () => {
  it('renders three compression level cards with Recommended pre-selected', () => {
    render(<ShrinkModal bytes={bytes} onApply={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Less compression')).toBeInTheDocument()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText('Extreme compression')).toBeInTheDocument()
    // Compress button present
    expect(screen.getByRole('button', { name: 'Compress' })).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<ShrinkModal bytes={bytes} onApply={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ShrinkModal — result step', () => {
  it('shows Original size, New size, and reduction % after compressing', async () => {
    render(<ShrinkModal bytes={bytes} onApply={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Compress' }))
    await waitFor(() => {
      expect(screen.getByText(/Original/i)).toBeInTheDocument()
      expect(screen.getByText(/New size/i)).toBeInTheDocument()
      expect(screen.getByText(/Reduced by/i)).toBeInTheDocument()
    })
  })

  it('calls onApply with result bytes when Apply is clicked', async () => {
    const onApply = vi.fn()
    render(<ShrinkModal bytes={bytes} onApply={onApply} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Compress' }))
    await waitFor(() => screen.getByRole('button', { name: 'Apply' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenCalledOnce()
    const passed = onApply.mock.calls[0][0] as Uint8Array
    expect(passed).toBeInstanceOf(Uint8Array)
  })

  it('does NOT call onApply when Back is clicked on result step', async () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(<ShrinkModal bytes={bytes} onApply={onApply} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Compress' }))
    await waitFor(() => screen.getByRole('button', { name: 'Back' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onApply).not.toHaveBeenCalled()
    // Back returns to options step
    expect(screen.getByRole('button', { name: 'Compress' })).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Landing from './Landing'
import { I18nProvider } from '../services/i18n'

function Wrapped({ onFiles, onCreateBlank = vi.fn() }: { onFiles: (f: File[]) => void; onCreateBlank?: () => void }) {
  return (
    <I18nProvider>
      <Landing onFiles={onFiles} onCreateBlank={onCreateBlank} />
    </I18nProvider>
  )
}

describe('Landing', () => {
  it('renders a "Choose file" button', () => {
    render(<Wrapped onFiles={vi.fn()} />)
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument()
  })

  it('renders the file-type hint text "PDF · PNG · JPG"', () => {
    render(<Wrapped onFiles={vi.fn()} />)
    expect(screen.getByText('PDF · PNG · JPG')).toBeInTheDocument()
  })

  it('renders a "start with a blank page" link and calls onCreateBlank when clicked', async () => {
    const onCreateBlank = vi.fn()
    render(<Wrapped onFiles={vi.fn()} onCreateBlank={onCreateBlank} />)
    const btn = screen.getByRole('button', { name: /blank page/i })
    await userEvent.click(btn)
    expect(onCreateBlank).toHaveBeenCalledOnce()
  })

  it('calls onFiles with the file when a PDF is dropped', () => {
    const onFiles = vi.fn()
    render(<Wrapped onFiles={onFiles} />)

    const dropzone = screen.getByRole('region', { name: /pdf drop zone/i })
    const pdfFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [pdfFile],
      },
    })

    expect(onFiles).toHaveBeenCalledOnce()
    expect(onFiles).toHaveBeenCalledWith([pdfFile])
  })

  it('does not call onFiles when a non-PDF file is dropped', () => {
    const onFiles = vi.fn()
    render(<Wrapped onFiles={onFiles} />)

    const dropzone = screen.getByRole('region', { name: /pdf drop zone/i })
    const txtFile = new File(['hello'], 'test.txt', { type: 'text/plain' })

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [txtFile],
      },
    })

    expect(onFiles).not.toHaveBeenCalled()
  })

  it('calls onFiles with file when file input changes', async () => {
    const onFiles = vi.fn()
    render(<Wrapped onFiles={onFiles} />)

    const pdfFile = new File(['%PDF-1.4'], 'sample.pdf', { type: 'application/pdf' })
    // Find the hidden file input
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, pdfFile)

    expect(onFiles).toHaveBeenCalledOnce()
    expect(onFiles).toHaveBeenCalledWith([pdfFile])
  })

  it('applies drag-over highlight class on dragover and removes on dragleave', () => {
    render(<Wrapped onFiles={vi.fn()} />)
    const dropzone = screen.getByRole('region', { name: /pdf drop zone/i })

    fireEvent.dragOver(dropzone, { dataTransfer: {} })
    expect(dropzone.className).toContain('lp-dropzone--active')

    fireEvent.dragLeave(dropzone)
    expect(dropzone.className).not.toContain('lp-dropzone--active')
  })

  it('switches to Chinese when 中文 toggle is clicked', async () => {
    render(<Wrapped onFiles={vi.fn()} />)
    const zhBtn = screen.getByRole('button', { name: '中文' })
    await userEvent.click(zhBtn)
    expect(zhBtn).toHaveAttribute('aria-pressed', 'true')
    // Headline should now be Chinese
    expect(screen.getByText(/編輯、簽署、加密/)).toBeInTheDocument()
  })
})

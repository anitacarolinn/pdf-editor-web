import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Landing from './Landing'

describe('Landing', () => {
  it('renders a "Choose file" button', () => {
    render(<Landing onFiles={vi.fn()} />)
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument()
  })

  it('renders the empty-state text "Open a PDF to get started"', () => {
    render(<Landing onFiles={vi.fn()} />)
    expect(screen.getByText('Open a PDF to get started')).toBeInTheDocument()
  })

  it('calls onFiles with the file when a PDF is dropped', () => {
    const onFiles = vi.fn()
    render(<Landing onFiles={onFiles} />)

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
    render(<Landing onFiles={onFiles} />)

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
    render(<Landing onFiles={onFiles} />)

    const pdfFile = new File(['%PDF-1.4'], 'sample.pdf', { type: 'application/pdf' })
    // Find the hidden file input
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, pdfFile)

    expect(onFiles).toHaveBeenCalledOnce()
    expect(onFiles).toHaveBeenCalledWith([pdfFile])
  })

  it('applies drag-over highlight class on dragover and removes on dragleave', () => {
    render(<Landing onFiles={vi.fn()} />)
    const dropzone = screen.getByRole('region', { name: /pdf drop zone/i })

    fireEvent.dragOver(dropzone, { dataTransfer: {} })
    expect(dropzone.className).toContain('landing-dropzone--active')

    fireEvent.dragLeave(dropzone)
    expect(dropzone.className).not.toContain('landing-dropzone--active')
  })
})

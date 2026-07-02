import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

// render-service is always mocked in component tests (no canvas/worker in jsdom).
// Here we also drive the encryption-detection + password-load seam.
const isPdfEncrypted = vi.fn()
vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 2 })),
  loadRenderDocWithPassword: vi.fn(async () => ({ numPages: 2 })),
  isPdfEncrypted: (...args: unknown[]) => isPdfEncrypted(...args),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
  WrongPasswordError: class WrongPasswordError extends Error {},
}))

// lock-service is the qpdf engine; mock it so unlock returns known bytes / throws.
const unlockPdf = vi.fn()
vi.mock('../services/lock-service', () => ({
  lockPdf: vi.fn(),
  unlockPdf: (...args: unknown[]) => unlockPdf(...args),
}))

async function encryptedFile(name: string): Promise<File> {
  const bytes = await makeSamplePdf(2)
  return new File([bytes.buffer as ArrayBuffer], name, { type: 'application/pdf' })
}

beforeEach(() => {
  useDocumentStore.setState({ bytes: null, fileName: null, past: [], future: [] })
  isPdfEncrypted.mockReset()
  unlockPdf.mockReset()
})

describe('opening a locked PDF', () => {
  it('surfaces a PasswordPrompt naming the file when the PDF is encrypted', async () => {
    isPdfEncrypted.mockResolvedValue(true)
    render(<App />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, await encryptedFile('locked-doc.pdf'))

    // The prompt should appear and name the file.
    await waitFor(() => expect(screen.getByText(/locked-doc\.pdf/)).toBeInTheDocument())
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    // Nothing loaded yet — still on the landing.
    expect(useDocumentStore.getState().bytes).toBeNull()
  })

  it('loads the document once the correct password is submitted', async () => {
    isPdfEncrypted.mockResolvedValue(true)
    const decrypted = await makeSamplePdf(2)
    unlockPdf.mockResolvedValue(decrypted)
    render(<App />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, await encryptedFile('locked-doc.pdf'))

    await screen.findByText(/locked-doc\.pdf/)
    await userEvent.type(screen.getByLabelText('Password'), 'correct')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    await waitFor(() => expect(useDocumentStore.getState().bytes).not.toBeNull())
    expect(unlockPdf).toHaveBeenCalledWith(expect.anything(), 'correct')
    // Prompt is gone (the password field disappears once loaded).
    await waitFor(() => expect(screen.queryByLabelText('Password')).not.toBeInTheDocument())
  })

  it('shows an inline error and keeps the prompt open on a wrong password', async () => {
    isPdfEncrypted.mockResolvedValue(true)
    unlockPdf.mockRejectedValue(new Error('Wrong password.'))
    render(<App />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, await encryptedFile('locked-doc.pdf'))

    await screen.findByText(/locked-doc\.pdf/)
    await userEvent.type(screen.getByLabelText('Password'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    // Modal still open, no document loaded.
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(useDocumentStore.getState().bytes).toBeNull()
  })

  it('skips the file (loads nothing) when the prompt is cancelled', async () => {
    isPdfEncrypted.mockResolvedValue(true)
    render(<App />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, await encryptedFile('locked-doc.pdf'))

    await screen.findByText(/locked-doc\.pdf/)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByText(/locked-doc\.pdf/)).not.toBeInTheDocument())
    expect(useDocumentStore.getState().bytes).toBeNull()
    expect(unlockPdf).not.toHaveBeenCalled()
  })

  it('confirms before opening the rest when a locked file is cancelled among several', async () => {
    // First file locked, second not.
    isPdfEncrypted.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    render(<App />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, [
      await encryptedFile('locked-doc.pdf'),
      await encryptedFile('open-doc.pdf'),
    ])

    // Password prompt for the locked file → cancel it.
    await screen.findByLabelText('Password')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // A confirmation must appear, naming the skipped file — nothing opened yet.
    await screen.findByRole('button', { name: 'Open the rest' })
    expect(screen.getByText(/locked-doc\.pdf/)).toBeInTheDocument()
    expect(useDocumentStore.getState().bytes).toBeNull()

    // Choosing to open the rest loads the other PDF.
    await userEvent.click(screen.getByRole('button', { name: 'Open the rest' }))
    await waitFor(() => expect(useDocumentStore.getState().bytes).not.toBeNull())
  })

  it('opens nothing when "Cancel all" is chosen at the confirmation', async () => {
    isPdfEncrypted.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    render(<App />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, [
      await encryptedFile('locked-doc.pdf'),
      await encryptedFile('open-doc.pdf'),
    ])

    await screen.findByLabelText('Password')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel all' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Cancel all' })).not.toBeInTheDocument(),
    )
    expect(useDocumentStore.getState().bytes).toBeNull()
  })
})

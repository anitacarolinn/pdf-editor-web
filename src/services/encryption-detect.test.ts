import { describe, it, expect, vi, beforeEach } from 'vitest'

// We mock pdfjs-dist so the detection logic can be exercised without a real
// worker / DOMMatrix. The mock lets each test decide whether getDocument
// resolves (unencrypted), fires onPassword (encrypted / wrong password), or
// resolves once a password is supplied.

const getDocument = vi.fn()

vi.mock('pdfjs-dist', () => {
  return {
    GlobalWorkerOptions: {},
    getDocument,
    PasswordResponses: { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 },
  }
})

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker-url' }))

beforeEach(() => {
  getDocument.mockReset()
})

describe('isPdfEncrypted', () => {
  it('returns false for a normal (unencrypted) PDF', async () => {
    getDocument.mockImplementation(() => ({
      promise: Promise.resolve({ numPages: 2, destroy: vi.fn() }),
      destroy: vi.fn(),
    }))
    const { isPdfEncrypted } = await import('./render-service')
    expect(await isPdfEncrypted(new Uint8Array([1, 2, 3]))).toBe(false)
  })

  it('returns true when pdfjs asks for a password (NEED_PASSWORD)', async () => {
    getDocument.mockImplementation((params: { onPassword?: (cb: unknown, reason: number) => void }) => {
      // pdfjs fires onPassword to request the password; the load promise stays
      // pending until one is supplied. We just report NEED_PASSWORD.
      params.onPassword?.(() => {}, 1)
      return { promise: new Promise(() => {}), destroy: vi.fn() }
    })
    const { isPdfEncrypted } = await import('./render-service')
    expect(await isPdfEncrypted(new Uint8Array([1, 2, 3]))).toBe(true)
  })

  it('returns true when pdfjs rejects with a PasswordException (real pdfjs 6.x behavior)', async () => {
    // Verified against real pdfjs-dist 6.1.200 + a real qpdf-encrypted PDF:
    // getDocument does NOT invoke onPassword — it REJECTS the load promise with
    // a PasswordException ("No password given"). Detection must treat that as
    // encrypted, not as a generic load failure.
    const passwordException = Object.assign(new Error('No password given'), {
      name: 'PasswordException',
      code: 1, // PasswordResponses.NEED_PASSWORD
    })
    getDocument.mockImplementation(() => ({
      promise: Promise.reject(passwordException),
      destroy: vi.fn(),
    }))
    const { isPdfEncrypted } = await import('./render-service')
    expect(await isPdfEncrypted(new Uint8Array([1, 2, 3]))).toBe(true)
  })

  it('returns false when pdfjs rejects for a non-password reason (broken file)', async () => {
    getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error('Invalid PDF structure')),
      destroy: vi.fn(),
    }))
    const { isPdfEncrypted } = await import('./render-service')
    expect(await isPdfEncrypted(new Uint8Array([1, 2, 3]))).toBe(false)
  })
})

describe('loadRenderDocWithPassword', () => {
  it('resolves a document when the correct password is given', async () => {
    getDocument.mockImplementation((params: { password?: string }) => {
      if (params.password === 'right') {
        return { promise: Promise.resolve({ numPages: 3, destroy: vi.fn() }), destroy: vi.fn() }
      }
      return { promise: Promise.reject(new Error('bad')), destroy: vi.fn() }
    })
    const { loadRenderDocWithPassword } = await import('./render-service')
    const doc = await loadRenderDocWithPassword(new Uint8Array([1]), 'right')
    expect(doc.numPages).toBe(3)
  })

  it('throws a WrongPasswordError when onPassword reports INCORRECT_PASSWORD', async () => {
    getDocument.mockImplementation((params: { password?: string; onPassword?: (cb: unknown, reason: number) => void }) => {
      if (params.password) {
        // pdfjs re-invokes onPassword with INCORRECT_PASSWORD on a bad retry.
        params.onPassword?.(() => {}, 2)
        return { promise: new Promise(() => {}), destroy: vi.fn() }
      }
      return { promise: new Promise(() => {}), destroy: vi.fn() }
    })
    const { loadRenderDocWithPassword, WrongPasswordError } = await import('./render-service')
    await expect(loadRenderDocWithPassword(new Uint8Array([1]), 'wrong')).rejects.toBeInstanceOf(
      WrongPasswordError,
    )
  })
})

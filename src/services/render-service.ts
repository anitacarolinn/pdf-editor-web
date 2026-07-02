import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

// pdf.js accepts an `onPassword` callback in getDocument's parameters at runtime
// (used to prompt for a password on encrypted files), but the shipped
// DocumentInitParameters type omits it (and isn't re-exported from the package
// root). Declare only the fields we pass so the calls below typecheck.
interface GetDocParams {
  data: Uint8Array
  password?: string
  onPassword?: (updatePassword: (pw: string) => void, reason: number) => void
}

let _init: Promise<typeof import('pdfjs-dist')> | null = null

function ensureInit(): Promise<typeof import('pdfjs-dist')> {
  return (_init ??= (async () => {
    const pdfjs = await import('pdfjs-dist')
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default
    return pdfjs
  })())
}

export function scaleForWidth(viewportWidth: number, targetWidth: number): number {
  return targetWidth / viewportWidth
}

export async function loadRenderDoc(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await ensureInit()
  // pdf.js transfers/detaches the buffer; pass a copy so the store's bytes stay intact
  return pdfjs.getDocument({ data: bytes.slice() }).promise
}

/**
 * Thrown by loadRenderDocWithPassword when the supplied password is rejected by
 * pdf.js (PasswordResponses.INCORRECT_PASSWORD). The open/drop flow catches this
 * to keep the password prompt open with an inline error.
 */
export class WrongPasswordError extends Error {
  constructor(message = 'Incorrect password') {
    super(message)
    this.name = 'WrongPasswordError'
  }
}

/**
 * Detect whether a PDF is password-protected WITHOUT decrypting it.
 *
 * pdf.js natively detects encryption at open time: it invokes the `onPassword`
 * callback (with PasswordResponses.NEED_PASSWORD) before resolving. We use that
 * signal to answer the yes/no question and immediately abort the load — we never
 * supply a password here, so the load promise is left pending and the task is
 * destroyed. If the document resolves without ever asking, it is not encrypted.
 */
export async function isPdfEncrypted(bytes: Uint8Array): Promise<boolean> {
  const pdfjs = await ensureInit()
  return await new Promise<boolean>((resolve) => {
    let settled = false
    let task: { promise: Promise<unknown>; destroy: () => Promise<void> } | undefined
    const finish = (encrypted: boolean) => {
      if (settled) return
      settled = true
      // Abort the (possibly pending) load and free the worker doc.
      Promise.resolve(task?.destroy()).catch(() => {})
      resolve(encrypted)
    }
    const params: GetDocParams = {
      data: bytes.slice(),
      // If pdf.js asks for a password, the file is encrypted. Do NOT answer —
      // that keeps the load pending; we destroy it in finish().
      onPassword: () => finish(true),
    }
    task = pdfjs.getDocument(params as Parameters<typeof pdfjs.getDocument>[0]) as unknown as {
      promise: Promise<unknown>
      destroy: () => Promise<void>
    }
    task.promise.then(
      () => finish(false),
      // Real pdf.js (v6.x) does NOT invoke onPassword for the yes/no case — it
      // REJECTS the load promise with a PasswordException ("No password given").
      // That rejection is the reliable "encrypted" signal. Any OTHER rejection
      // means the file is broken, not locked → treat as "not encrypted" so the
      // normal error path handles it.
      (err: unknown) =>
        finish((err as { name?: string })?.name === 'PasswordException'),
    )
  })
}

/**
 * Load an encrypted PDF for rendering, given a password. Resolves the pdf.js
 * document when the password is correct. Throws WrongPasswordError when pdf.js
 * reports the password is incorrect (PasswordResponses.INCORRECT_PASSWORD).
 */
export async function loadRenderDocWithPassword(
  bytes: Uint8Array,
  password: string,
): Promise<PDFDocumentProxy> {
  const pdfjs = await ensureInit()
  const INCORRECT = pdfjs.PasswordResponses?.INCORRECT_PASSWORD ?? 2
  return await new Promise<PDFDocumentProxy>((resolve, reject) => {
    let settled = false
    let task: { promise: Promise<PDFDocumentProxy>; destroy: () => Promise<void> } | undefined
    const params: GetDocParams = {
      data: bytes.slice(),
      password,
      // pdf.js re-invokes onPassword with INCORRECT_PASSWORD when the password
      // we passed is wrong. Surface that as a typed error rather than hanging.
      onPassword: (_updatePassword: (pw: string) => void, reason: number) => {
        if (reason === INCORRECT && !settled) {
          settled = true
          Promise.resolve(task?.destroy()).catch(() => {})
          reject(new WrongPasswordError())
        }
      },
    }
    task = pdfjs.getDocument(params as Parameters<typeof pdfjs.getDocument>[0]) as unknown as {
      promise: Promise<PDFDocumentProxy>
      destroy: () => Promise<void>
    }
    task.promise.then(
      (doc) => {
        if (!settled) {
          settled = true
          resolve(doc)
        }
      },
      (err) => {
        if (!settled) {
          settled = true
          reject(err)
        }
      },
    )
  })
}

export function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
  opts?: { fluid?: boolean },
): { cancel(): void; done: Promise<void> } {
  let renderTask: RenderTask | null = null
  let cancelled = false

  const done = (async () => {
    await ensureInit()
    const page = await doc.getPage(pageNumber)
    if (cancelled) return
    // Render at the device pixel ratio so the output is crisp on HiDPI/Retina
    // screens. The backing store is sized at scale*dpr; CSS displays it at the
    // logical size (scale), so the browser never has to upscale a low-res bitmap.
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
    const viewport = page.getViewport({ scale: scale * dpr })
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    canvas.width = viewport.width
    canvas.height = viewport.height
    if (opts?.fluid) {
      // Grid thumbnails: let CSS size the canvas (width:100%, height:auto) so it
      // always fits the card. Setting inline px here would overflow the fixed-
      // width card and get clipped by overflow:hidden.
      canvas.style.removeProperty('width')
      canvas.style.removeProperty('height')
    } else {
      canvas.style.width = `${viewport.width / dpr}px`
      canvas.style.height = `${viewport.height / dpr}px`
    }
    renderTask = page.render({ canvasContext: ctx, viewport, canvas })
    try {
      await renderTask.promise
    } catch (e: unknown) {
      // Swallow cancellation errors; rethrow everything else
      if (
        e instanceof Error &&
        e.name === 'RenderingCancelledException'
      ) return
      throw e
    }
  })()

  return {
    cancel() {
      cancelled = true
      renderTask?.cancel()
    },
    done,
  }
}

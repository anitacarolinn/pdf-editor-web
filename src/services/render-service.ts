import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

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

export function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): { cancel(): void; done: Promise<void> } {
  let renderTask: RenderTask | null = null
  let cancelled = false

  const done = (async () => {
    await ensureInit()
    const page = await doc.getPage(pageNumber)
    if (cancelled) return
    const viewport = page.getViewport({ scale })
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    canvas.width = viewport.width
    canvas.height = viewport.height
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

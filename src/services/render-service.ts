import type { PDFDocumentProxy } from 'pdfjs-dist'

let _pdfjsInitialized = false

async function _ensureInitialized(): Promise<void> {
  if (_pdfjsInitialized) return
  _pdfjsInitialized = true

  // Lazy import pdfjs to avoid DOMMatrix errors in test environments
  const pdfjs = await import('pdfjs-dist')
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')

  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default
}

export function scaleForWidth(viewportWidth: number, targetWidth: number): number {
  return targetWidth / viewportWidth
}

export async function loadRenderDoc(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  await _ensureInitialized()
  const pdfjs = await import('pdfjs-dist')
  // pdf.js transfers/detaches the buffer; pass a copy so the store's bytes stay intact
  return pdfjs.getDocument({ data: bytes.slice() }).promise
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<void> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: ctx, viewport, canvas }).promise
}

import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadRenderDoc, renderPageToCanvas } from './render-service'

export function estimateScale(targetLongEdgePx: number, pageLongEdgePt: number): number {
  return Math.min(2, targetLongEdgePx / pageLongEdgePt)
}

export async function shrinkPdf(
  bytes: Uint8Array,
  opts: { quality?: number; targetLongEdgePx?: number } = {},
): Promise<Uint8Array> {
  const { quality = 0.7, targetLongEdgePx = 1600 } = opts
  const src = await PDFDocument.load(bytes)
  const rdoc: PDFDocumentProxy = await loadRenderDoc(bytes)
  const out = await PDFDocument.create()
  const pageCount = src.getPageCount()
  for (let i = 0; i < pageCount; i++) {
    const { width: pw, height: ph } = src.getPage(i).getSize()
    const scale = estimateScale(targetLongEdgePx, Math.max(pw, ph))
    const canvas = document.createElement('canvas')
    await renderPageToCanvas(rdoc, i + 1, canvas, scale).done
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const jpg = await out.embedJpg(dataUrl)
    const page = out.addPage([pw, ph])
    page.drawImage(jpg, { x: 0, y: 0, width: pw, height: ph })
  }
  return out.save()
}

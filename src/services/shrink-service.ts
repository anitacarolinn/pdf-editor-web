import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadRenderDoc, renderPageToCanvas } from './render-service'

export function estimateScale(targetLongEdgePx: number, pageLongEdgePt: number): number {
  return Math.min(2, targetLongEdgePx / pageLongEdgePt)
}

export type CompressionLevel = 'less' | 'recommended' | 'extreme'

export const LEVEL_CONFIG: Record<
  CompressionLevel,
  { quality: number; targetLongEdgePx: number }
> = {
  less:        { quality: 0.8, targetLongEdgePx: 2400 },
  recommended: { quality: 0.6, targetLongEdgePx: 1600 },
  extreme:     { quality: 0.4, targetLongEdgePx: 1100 },
}

export async function shrinkPdfWithLevel(
  bytes: Uint8Array,
  level: CompressionLevel,
): Promise<Uint8Array> {
  const { quality, targetLongEdgePx } = LEVEL_CONFIG[level]
  return shrinkPdf(bytes, { quality, targetLongEdgePx })
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

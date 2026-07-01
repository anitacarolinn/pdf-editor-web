import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageToCanvas } from './render-service'

export function imageName(pageNumber: number, type: 'png' | 'jpeg'): string {
  return `page-${pageNumber}.${type === 'jpeg' ? 'jpg' : 'png'}`
}

export async function canvasToBytes(
  canvas: HTMLCanvasElement,
  type: 'png' | 'jpeg',
): Promise<Uint8Array> {
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      type === 'jpeg' ? 'image/jpeg' : 'image/png',
    ),
  )
  return new Uint8Array(await blob.arrayBuffer())
}

export async function exportPagesAsImages(
  doc: PDFDocumentProxy,
  pages: number[],
  type: 'png' | 'jpeg',
  scale: number,
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const out: { name: string; bytes: Uint8Array }[] = []
  for (const p of pages) {
    const canvas = document.createElement('canvas')
    await renderPageToCanvas(doc, p, canvas, scale).done
    out.push({ name: imageName(p, type), bytes: await canvasToBytes(canvas, type) })
  }
  return out
}

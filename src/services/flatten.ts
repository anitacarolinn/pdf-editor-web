import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { OverlayObject } from './overlay-store'
import { rectToPdf, fontSizeToPt, hexToRgb01 } from './overlay-coords'

export async function flattenObjects(
  bytes: Uint8Array,
  objects: OverlayObject[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const pageCount = doc.getPageCount()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const o of objects) {
    if (o.page < 0 || o.page >= pageCount) continue
    const page = doc.getPage(o.page)
    const { width: pw, height: ph } = page.getSize()
    const r = rectToPdf(o, pw, ph)
    if (o.type === 'text') {
      const size = fontSizeToPt(o, ph)
      const c = hexToRgb01(o.color ?? '#000000')
      page.drawText(o.text ?? '', {
        x: r.x,
        y: r.yTop - size,
        size,
        font,
        color: rgb(c.r, c.g, c.b),
      })
    } else if (o.type === 'image' && o.imageBytes) {
      const img =
        o.imageType === 'jpeg'
          ? await doc.embedJpg(o.imageBytes)
          : await doc.embedPng(o.imageBytes)
      page.drawImage(img, { x: r.x, y: r.y, width: r.width, height: r.height })
    }
  }
  return doc.save()
}

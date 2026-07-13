import { PDFDocument, degrees as pdfDegrees, StandardFonts, rgb } from 'pdf-lib'

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}

export async function rotatePage(
  bytes: Uint8Array,
  pageIndex: number,
  degrees: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const page = doc.getPage(pageIndex)
  const current = page.getRotation().angle
  const next = (((current + degrees) % 360) + 360) % 360
  page.setRotation(pdfDegrees(next))
  return doc.save()
}

export async function rotatePages(
  bytes: Uint8Array,
  indices: number[],
  degrees: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  for (const i of new Set(indices)) {
    const page = doc.getPage(i)
    const next = (((page.getRotation().angle + degrees) % 360) + 360) % 360
    page.setRotation(pdfDegrees(next))
  }
  return doc.save()
}

export async function deletePages(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  // remove from highest index down so earlier indices stay valid
  const sorted = [...new Set(indices)].sort((a, b) => b - a)
  for (const i of sorted) doc.removePage(i)
  return doc.save()
}

export async function reorderPages(
  bytes: Uint8Array,
  newOrder: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes)
  const count = src.getPageCount()
  const valid =
    newOrder.length === count &&
    new Set(newOrder).size === count &&
    newOrder.every((i) => i >= 0 && i < count)
  if (!valid) throw new Error('newOrder must be a permutation of all page indices')

  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, newOrder)
  copied.forEach((p) => out.addPage(p))
  return out.save()
}

/** Create a new single-page PDF with one blank page (defaults to A4 portrait,
 *  595×842pt — the same size `insertBlankPage` uses). For starting from scratch
 *  without uploading a file. */
export async function createBlankPdf(
  size: [number, number] = [595, 842],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage(size)
  return doc.save()
}

export async function insertBlankPage(
  bytes: Uint8Array,
  atIndex: number,
  size: [number, number] = [595, 842],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  doc.insertPage(atIndex, size)
  return doc.save()
}

export async function extractPages(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, indices)
  copied.forEach((p) => out.addPage(p))
  return out.save()
}

export async function mergePdfs(docs: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (const bytes of docs) {
    const src = await PDFDocument.load(bytes)
    const copied = await out.copyPages(src, src.getPageIndices())
    copied.forEach((p) => out.addPage(p))
  }
  return out.save()
}

export async function splitPdf(
  bytes: Uint8Array,
  ranges: number[][],
): Promise<Uint8Array[]> {
  const results: Uint8Array[] = []
  for (const range of ranges) {
    results.push(await extractPages(bytes, range))
  }
  return results
}

export async function duplicatePages(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  // highest-first so earlier insertions don't shift not-yet-processed indices
  const sorted = [...new Set(indices)].sort((a, b) => b - a)
  for (const i of sorted) {
    const [copy] = await doc.copyPages(doc, [i])
    doc.insertPage(i + 1, copy)
  }
  return doc.save()
}

export async function replacePage(
  bytes: Uint8Array,
  index: number,
  otherBytes: Uint8Array,
  otherIndex = 0,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const src = await PDFDocument.load(otherBytes)
  const [copy] = await doc.copyPages(src, [otherIndex])
  doc.insertPage(index, copy) // now the replacement sits BEFORE the old page
  doc.removePage(index + 1) // remove the old page (shifted by +1)
  return doc.save()
}

export type PageNumberFormat = 'n' | 'n/total' | 'zh' | 'dash'
export type PageNumberPosition = 'left' | 'center' | 'right'

export interface PageNumberOpts {
  format?: PageNumberFormat
  position?: PageNumberPosition
  /** Number shown on the first numbered page. */
  startAt?: number
  /** Leave the first page unnumbered (cover pages); counting begins on page 2. */
  skipFirst?: boolean
  fontSize?: number
}

export function pageNumberLabel(format: PageNumberFormat, n: number, total: number): string {
  switch (format) {
    case 'n/total': return `${n} / ${total}`
    case 'zh': return `第 ${n} 頁`
    case 'dash': return `— ${n} —`
    default: return `${n}`
  }
}

// The standard PDF fonts (WinAnsi) can't encode CJK glyphs, so the Chinese
// "第 n 頁" format is rasterized: render the label to a canvas and embed it as
// a PNG. Browser-only — the latin formats stay as crisp vector text.
const LABEL_SCALE = 4
function renderLabelToPng(text: string, fontSizePt: number): { bytes: Uint8Array; width: number; height: number } {
  const px = fontSizePt * LABEL_SCALE
  const fontStack = `500 ${px}px "Geist Variable", "Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", sans-serif`
  const measureCtx = document.createElement('canvas').getContext('2d')!
  measureCtx.font = fontStack
  const w = Math.max(1, Math.ceil(measureCtx.measureText(text).width))
  const h = Math.ceil(px * 1.35)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.font = fontStack
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgb(77,77,77)'
  ctx.fillText(text, 0, px)
  const b64 = canvas.toDataURL('image/png').split(',')[1]
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, width: w, height: h }
}

export async function addPageNumbers(
  bytes: Uint8Array,
  opts: PageNumberOpts = {},
): Promise<Uint8Array> {
  const { format = 'n', position = 'center', startAt = 1, skipFirst = false, fontSize = 10 } = opts
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages()
  const firstIdx = skipFirst && pages.length > 1 ? 1 : 0
  const total = pages.length - firstIdx
  const color = rgb(0.3, 0.3, 0.3)
  const margin = 40
  const y = 24

  const font = format === 'zh' ? null : await doc.embedFont(StandardFonts.Helvetica)

  for (let i = firstIdx; i < pages.length; i++) {
    const page = pages[i]
    const n = startAt + (i - firstIdx)
    const label = pageNumberLabel(format, n, total)
    const { width: pw } = page.getSize()

    if (format === 'zh') {
      const png = renderLabelToPng(label, fontSize)
      const img = await doc.embedPng(png.bytes)
      const drawW = png.width / LABEL_SCALE
      const drawH = png.height / LABEL_SCALE
      const x = position === 'left' ? margin : position === 'right' ? pw - margin - drawW : pw / 2 - drawW / 2
      page.drawImage(img, { x, y: y - drawH * 0.25, width: drawW, height: drawH })
    } else {
      const w = font!.widthOfTextAtSize(label, fontSize)
      const x = position === 'left' ? margin : position === 'right' ? pw - margin - w : pw / 2 - w / 2
      page.drawText(label, { x, y, size: fontSize, font: font!, color })
    }
  }
  return doc.save()
}

export type WatermarkOpts =
  | { kind: 'text'; text: string; opacity?: number; fontSize?: number }
  | { kind: 'image'; imageBytes: Uint8Array; imageType: 'png' | 'jpeg'; opacity?: number }

export async function addWatermark(
  bytes: Uint8Array,
  opts: WatermarkOpts,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages()

  if (opts.kind === 'text') {
    const { text, fontSize = 48, opacity = 0.25 } = opts
    const font = await doc.embedFont(StandardFonts.Helvetica)
    for (const page of pages) {
      const { width, height } = page.getSize()
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity,
        rotate: pdfDegrees(45),
      })
    }
  } else {
    // image watermark: center at ~40% page width
    const { imageBytes, imageType, opacity = 0.3 } = opts
    const embeddedImage = imageType === 'png'
      ? await doc.embedPng(imageBytes)
      : await doc.embedJpg(imageBytes)
    for (const page of pages) {
      const { width, height } = page.getSize()
      const targetW = width * 0.4
      const scale = targetW / embeddedImage.width
      const targetH = embeddedImage.height * scale
      page.drawImage(embeddedImage, {
        x: (width - targetW) / 2,
        y: (height - targetH) / 2,
        width: targetW,
        height: targetH,
        opacity,
      })
    }
  }
  return doc.save()
}

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

export async function addPageNumbers(
  bytes: Uint8Array,
  opts: { startAt?: number; format?: 'n' | 'n/total'; fontSize?: number } = {},
): Promise<Uint8Array> {
  const { startAt = 1, format = 'n', fontSize = 10 } = opts
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  pages.forEach((page, i) => {
    const label = format === 'n/total' ? `${startAt + i} / ${pages.length}` : `${startAt + i}`
    const width = font.widthOfTextAtSize(label, fontSize)
    const { width: pw } = page.getSize()
    page.drawText(label, {
      x: pw / 2 - width / 2,
      y: 24,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  })
  return doc.save()
}

export async function addWatermark(
  bytes: Uint8Array,
  text: string,
  opts: { fontSize?: number; opacity?: number } = {},
): Promise<Uint8Array> {
  const { fontSize = 48, opacity = 0.25 } = opts
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const page of doc.getPages()) {
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
  return doc.save()
}

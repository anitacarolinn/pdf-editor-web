import { PDFDocument, degrees as pdfDegrees } from 'pdf-lib'

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

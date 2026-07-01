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

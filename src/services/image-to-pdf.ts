import { PDFDocument } from 'pdf-lib'

export async function imagesToPdf(
  items: { bytes: Uint8Array; type: 'png' | 'jpeg' }[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const { bytes, type } of items) {
    const embeddedImage = type === 'png'
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes)
    const { width, height } = embeddedImage
    const page = doc.addPage([width, height])
    page.drawImage(embeddedImage, { x: 0, y: 0, width, height })
  }
  return doc.save()
}

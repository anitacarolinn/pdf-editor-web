import { PDFDocument } from 'pdf-lib'

export interface PdfInfo {
  pageCount: number
  title: string
  author: string
  subject: string
  creator: string
  producer: string
  pageSizes: { width: number; height: number }[]
}

export async function readInfo(bytes: Uint8Array): Promise<PdfInfo> {
  const doc = await PDFDocument.load(bytes)
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    pageSizes: doc.getPages().map((p) => ({
      width: Math.round(p.getWidth()),
      height: Math.round(p.getHeight()),
    })),
  }
}

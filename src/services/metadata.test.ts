import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { readInfo } from './metadata'

async function pdfWithTitle(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('My Doc')
  doc.setAuthor('Alice')
  doc.addPage([100, 200])
  doc.addPage([300, 400])
  return doc.save()
}

describe('readInfo', () => {
  it('reads metadata and page sizes', async () => {
    const info = await readInfo(await pdfWithTitle())
    expect(info.pageCount).toBe(2)
    expect(info.title).toBe('My Doc')
    expect(info.author).toBe('Alice')
    expect(info.pageSizes).toEqual([
      { width: 100, height: 200 },
      { width: 300, height: 400 },
    ])
  })

  it('returns empty strings for missing fields', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([100, 100])
    const info = await readInfo(await doc.save())
    expect(info.title).toBe('')
    expect(info.author).toBe('')
  })
})

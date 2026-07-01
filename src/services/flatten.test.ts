import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { flattenObjects } from './flatten'
import type { OverlayObject } from './overlay-store'

async function blankPdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([600, 800])
  return doc.save()
}

describe('flattenObjects', () => {
  it('draws a text object without changing page count, not mutating input', async () => {
    const bytes = await blankPdf(2)
    const copy = bytes.slice()
    const objs: OverlayObject[] = [
      { id: 'o1', page: 1, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.1, text: 'Hello', fontSizePct: 0.03, color: '#112233' },
    ]
    const out = await flattenObjects(bytes, objs)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
    expect(out.length).not.toBe(bytes.length)
    expect(bytes).toEqual(copy) // input not mutated
  })

  it('skips objects on out-of-range pages', async () => {
    const bytes = await blankPdf(1)
    const objs: OverlayObject[] = [
      { id: 'o1', page: 5, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.1, text: 'x' },
    ]
    const out = await flattenObjects(bytes, objs)
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })
})

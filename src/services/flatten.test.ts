import { describe, it, expect } from 'vitest'
import { PDFDocument, degrees } from 'pdf-lib'
import { flattenObjects } from './flatten'
import type { OverlayObject } from './overlay-store'
import type { MarkupObject } from './markup-store'

async function blankPdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([600, 800])
  return doc.save()
}

async function rotatedPdf(angle: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([600, 800])
  page.setRotation(degrees(angle))
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

  it('flattens onto a rotated page, preserving rotation and page count', async () => {
    for (const angle of [90, 180, 270]) {
      const bytes = await rotatedPdf(angle)
      const objs: OverlayObject[] = [
        { id: 'o1', page: 0, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.1, text: 'Hi', fontSizePct: 0.03 },
      ]
      const out = await flattenObjects(bytes, objs)
      const doc = await PDFDocument.load(out)
      expect(doc.getPageCount()).toBe(1)
      // The page's /Rotate must be untouched by flatten.
      expect(doc.getPage(0).getRotation().angle).toBe(angle)
      expect(out.length).toBeGreaterThan(0)
    }
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

describe('flattenObjects — markup', () => {
  it('draws highlight/underline/strikethrough without changing page count', async () => {
    const bytes = await blankPdf(1)
    const markup: MarkupObject[] = [
      { id: 'm1', page: 0, type: 'highlight', color: '#ffd54a',
        rects: [{ xPct: 0.1, yPct: 0.2, wPct: 0.4, hPct: 0.03 }] },
      { id: 'm2', page: 0, type: 'underline', color: '#000000',
        rects: [{ xPct: 0.1, yPct: 0.3, wPct: 0.4, hPct: 0.03 }] },
      { id: 'm3', page: 0, type: 'strikethrough', color: '#000000',
        rects: [{ xPct: 0.1, yPct: 0.4, wPct: 0.4, hPct: 0.03 }] },
    ]
    const out = await flattenObjects(bytes, [], markup)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(1)
    expect(out.length).toBeGreaterThan(bytes.length) // content was added
  })

  it('skips markup on out-of-range pages', async () => {
    const bytes = await blankPdf(1)
    const markup: MarkupObject[] = [
      { id: 'm1', page: 9, type: 'highlight', color: '#ffd54a',
        rects: [{ xPct: 0.1, yPct: 0.2, wPct: 0.4, hPct: 0.03 }] },
    ]
    const out = await flattenObjects(bytes, [], markup)
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })

  it('is backward compatible when markup omitted', async () => {
    const bytes = await blankPdf(1)
    const out = await flattenObjects(bytes, [])
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })
})

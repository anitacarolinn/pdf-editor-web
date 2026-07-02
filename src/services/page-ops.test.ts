import { describe, it, expect } from 'vitest'
import { makeSamplePdf, getPageWidths } from '../test/fixtures'
import { getPageCount, rotatePage, rotatePages, deletePages, reorderPages, insertBlankPage, extractPages, mergePdfs, splitPdf, duplicatePages, replacePage, addPageNumbers, addWatermark } from './page-ops'
import { PDFDocument } from 'pdf-lib'

describe('getPageCount', () => {
  it('returns the number of pages', async () => {
    const bytes = await makeSamplePdf(4)
    expect(await getPageCount(bytes)).toBe(4)
  })
})

describe('rotatePage', () => {
  it('adds 90 degrees to the target page only', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await rotatePage(bytes, 1, 90)
    const doc = await PDFDocument.load(out)
    expect(doc.getPage(1).getRotation().angle).toBe(90)
    expect(doc.getPage(0).getRotation().angle).toBe(0)
  })

  it('does not mutate the input bytes', async () => {
    const bytes = await makeSamplePdf(1)
    const copy = bytes.slice()
    await rotatePage(bytes, 0, 90)
    expect(bytes).toEqual(copy)
  })
})

describe('rotatePages', () => {
  it('rotates all listed pages, leaves others', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await rotatePages(bytes, [0, 2], 90)
    const doc = await PDFDocument.load(out)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
    expect(doc.getPage(1).getRotation().angle).toBe(0)
    expect(doc.getPage(2).getRotation().angle).toBe(90)
  })

  it('normalizes negative degrees (rotate left)', async () => {
    const bytes = await makeSamplePdf(1)
    const out = await rotatePages(bytes, [0], -90)
    const doc = await PDFDocument.load(out)
    expect(doc.getPage(0).getRotation().angle).toBe(270)
  })
})

describe('deletePages', () => {
  it('removes the given pages and keeps survivor order', async () => {
    const bytes = await makeSamplePdf(4) // widths 100,200,300,400
    const out = await deletePages(bytes, [1, 3])
    expect(await getPageWidths(out)).toEqual([100, 300])
  })
})

describe('reorderPages', () => {
  it('reorders pages per the permutation', async () => {
    const bytes = await makeSamplePdf(3) // widths 100,200,300
    const out = await reorderPages(bytes, [2, 0, 1])
    expect(await getPageWidths(out)).toEqual([300, 100, 200])
  })

  it('throws if newOrder is not a permutation of all pages', async () => {
    const bytes = await makeSamplePdf(3)
    await expect(reorderPages(bytes, [0, 1])).rejects.toThrow()
  })
})

describe('insertBlankPage', () => {
  it('inserts a blank page at the given index', async () => {
    const bytes = await makeSamplePdf(2) // widths 100,200
    const out = await insertBlankPage(bytes, 1, [150, 200])
    expect(await getPageWidths(out)).toEqual([100, 150, 200])
  })

  it('appends when atIndex equals page count', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await insertBlankPage(bytes, 2, [150, 200])
    expect(await getPageWidths(out)).toEqual([100, 200, 150])
  })
})

describe('extractPages', () => {
  it('returns only the requested pages in order', async () => {
    const bytes = await makeSamplePdf(4) // 100,200,300,400
    const out = await extractPages(bytes, [3, 1])
    expect(await getPageWidths(out)).toEqual([400, 200])
  })
})

describe('mergePdfs', () => {
  it('concatenates pages of all inputs in order', async () => {
    const a = await makeSamplePdf(2) // 100,200
    const b = await makeSamplePdf(1) // 100
    const out = await mergePdfs([a, b])
    expect(await getPageWidths(out)).toEqual([100, 200, 100])
  })
})

describe('splitPdf', () => {
  it('produces one pdf per range with the right pages', async () => {
    const bytes = await makeSamplePdf(4) // 100,200,300,400
    const parts = await splitPdf(bytes, [[0, 1], [2, 3]])
    expect(parts).toHaveLength(2)
    expect(await getPageWidths(parts[0])).toEqual([100, 200])
    expect(await getPageWidths(parts[1])).toEqual([300, 400])
  })
})

describe('duplicatePages', () => {
  it('inserts a copy of each page after the original', async () => {
    const bytes = await makeSamplePdf(3) // widths 100,200,300
    const out = await duplicatePages(bytes, [1])
    expect(await getPageWidths(out)).toEqual([100, 200, 200, 300])
  })

  it('duplicates multiple selected pages correctly', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await duplicatePages(bytes, [0, 2])
    expect(await getPageWidths(out)).toEqual([100, 100, 200, 300, 300])
  })
})

describe('replacePage', () => {
  it('replaces the page at index with a page from another pdf', async () => {
    const base = await makeSamplePdf(3) // 100,200,300
    const other = await makeSamplePdf(5) // 100,200,300,400,500
    const out = await replacePage(base, 1, other, 3) // put other's page3 (width 400) at index 1
    expect(await getPageWidths(out)).toEqual([100, 400, 300])
  })
})

describe('addPageNumbers', () => {
  it('returns a valid pdf with the same page count and changed bytes', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await addPageNumbers(bytes, { format: 'n/total' })
    expect(await getPageCount(out)).toBe(3)
    expect(out.length).not.toBe(bytes.length) // content was added
  })

  it('does not mutate the input', async () => {
    const bytes = await makeSamplePdf(2)
    const copy = bytes.slice()
    await addPageNumbers(bytes)
    expect(bytes).toEqual(copy)
  })

  it('supports the dash format (em dash encodes in the standard font)', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await addPageNumbers(bytes, { format: 'dash' })
    expect(await getPageCount(out)).toBe(2)
    expect(out.length).not.toBe(bytes.length)
  })

  it('honours position + startAt without changing the page count', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await addPageNumbers(bytes, { format: 'n', position: 'right', startAt: 5 })
    expect(await getPageCount(out)).toBe(3)
    expect(out.length).not.toBe(bytes.length)
  })

  it('skipFirst keeps the page count intact', async () => {
    const bytes = await makeSamplePdf(3)
    const out = await addPageNumbers(bytes, { format: 'n/total', skipFirst: true })
    expect(await getPageCount(out)).toBe(3)
  })
})

describe('pageNumberLabel', () => {
  it('formats each style correctly', async () => {
    const { pageNumberLabel } = await import('./page-ops')
    expect(pageNumberLabel('n', 3, 12)).toBe('3')
    expect(pageNumberLabel('n/total', 3, 12)).toBe('3 / 12')
    expect(pageNumberLabel('zh', 3, 12)).toBe('第 3 頁')
    expect(pageNumberLabel('dash', 3, 12)).toBe('— 3 —')
  })
})

describe('addWatermark', () => {
  it('stamps text on every page, preserving count (new opts shape)', async () => {
    const bytes = await makeSamplePdf(2)
    const out = await addWatermark(bytes, { kind: 'text', text: 'DRAFT' })
    expect(await getPageCount(out)).toBe(2)
    expect(out.length).not.toBe(bytes.length)
  })

  it('does not mutate the input (text)', async () => {
    const bytes = await makeSamplePdf(1)
    const copy = bytes.slice()
    await addWatermark(bytes, { kind: 'text', text: 'X' })
    expect(bytes).toEqual(copy)
  })

  it('stamps an image on every page, preserving count', async () => {
    // Minimal 1x1 white PNG (67 bytes)
    const PNG_1X1 = new Uint8Array([
      0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a, // PNG signature
      0x00,0x00,0x00,0x0d, // IHDR length
      0x49,0x48,0x44,0x52, // "IHDR"
      0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01, // 1x1
      0x08,0x02,           // bit depth 8, color type RGB
      0x00,0x00,0x00,      // compression/filter/interlace
      0x90,0x77,0x53,0xde, // CRC
      0x00,0x00,0x00,0x0c, // IDAT length
      0x49,0x44,0x41,0x54, // "IDAT"
      0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,0x00, // compressed pixel
      0x00,0x02,0x00,0x01, // rest
      0xe2,0x21,0xbc,0x33, // CRC
      0x00,0x00,0x00,0x00, // IEND length
      0x49,0x45,0x4e,0x44, // "IEND"
      0xae,0x42,0x60,0x82, // CRC
    ])
    const bytes = await makeSamplePdf(2)
    const out = await addWatermark(bytes, { kind: 'image', imageBytes: PNG_1X1, imageType: 'png', opacity: 0.3 })
    expect(await getPageCount(out)).toBe(2)
    expect(out.length).not.toBe(bytes.length)
  })
})

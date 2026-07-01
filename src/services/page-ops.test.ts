import { describe, it, expect } from 'vitest'
import { makeSamplePdf, getPageWidths } from '../test/fixtures'
import { getPageCount, rotatePage, deletePages, reorderPages, insertBlankPage, extractPages } from './page-ops'
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

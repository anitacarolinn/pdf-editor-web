import { describe, it, expect } from 'vitest'
import { makeSamplePdf } from '../test/fixtures'
import { getPageCount, rotatePage } from './page-ops'
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

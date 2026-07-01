import { describe, it, expect } from 'vitest'
import { makeSamplePdf, getPageWidths, getPageCount } from './fixtures'

describe('test fixtures', () => {
  it('builds a pdf with identifiable page widths', async () => {
    const bytes = await makeSamplePdf(3)
    expect(await getPageCount(bytes)).toBe(3)
    expect(await getPageWidths(bytes)).toEqual([100, 200, 300])
  })
})

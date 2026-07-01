import { describe, it, expect } from 'vitest'
import { makeSamplePdf } from '../test/fixtures'
import { getPageCount } from './page-ops'

describe('getPageCount', () => {
  it('returns the number of pages', async () => {
    const bytes = await makeSamplePdf(4)
    expect(await getPageCount(bytes)).toBe(4)
  })
})

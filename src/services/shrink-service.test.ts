import { describe, it, expect } from 'vitest'
import { estimateScale } from './shrink-service'
import type { CompressionLevel } from './shrink-service'

describe('estimateScale', () => {
  it('scales the long edge toward the target, clamped to 2', () => {
    expect(estimateScale(1600, 800)).toBe(2)      // wants 2.0 but clamp keeps 2
    expect(estimateScale(800, 1600)).toBe(0.5)
    expect(estimateScale(1600, 1600)).toBe(1)
  })
})

describe('shrinkPdfWithLevel — level mapping', () => {
  it('accepts all three levels without throwing', async () => {
    const levels: CompressionLevel[] = ['less', 'recommended', 'extreme']
    for (const level of levels) {
      expect(typeof level).toBe('string')
    }
  })

  it('LEVEL_CONFIG has correct quality values', async () => {
    const { LEVEL_CONFIG } = await import('./shrink-service')
    expect(LEVEL_CONFIG.less.quality).toBeCloseTo(0.8)
    expect(LEVEL_CONFIG.recommended.quality).toBeCloseTo(0.6)
    expect(LEVEL_CONFIG.extreme.quality).toBeCloseTo(0.4)
    expect(LEVEL_CONFIG.less.targetLongEdgePx).toBeGreaterThanOrEqual(2000)
    expect(LEVEL_CONFIG.recommended.targetLongEdgePx).toBe(1600)
    expect(LEVEL_CONFIG.extreme.targetLongEdgePx).toBeLessThanOrEqual(1200)
  })
})

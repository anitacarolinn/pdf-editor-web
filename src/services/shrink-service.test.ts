import { describe, it, expect } from 'vitest'
import { estimateScale } from './shrink-service'

describe('estimateScale', () => {
  it('scales the long edge toward the target, clamped to 2', () => {
    expect(estimateScale(1600, 800)).toBe(2)      // wants 2.0 but clamp keeps 2
    expect(estimateScale(800, 1600)).toBe(0.5)
    expect(estimateScale(1600, 1600)).toBe(1)
  })
})

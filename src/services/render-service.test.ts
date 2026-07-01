import { describe, it, expect } from 'vitest'
import { scaleForWidth } from './render-service'

describe('scaleForWidth', () => {
  it('computes the scale factor to hit a target width', () => {
    expect(scaleForWidth(200, 100)).toBe(0.5)
    expect(scaleForWidth(100, 300)).toBe(3)
  })
})

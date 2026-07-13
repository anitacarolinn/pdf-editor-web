import { describe, it, expect } from 'vitest'
import { normalizeImageOrientation } from './image-normalize'

describe('normalizeImageOrientation', () => {
  it('returns null for an image with no decoded dimensions (fallback to raw bytes)', async () => {
    const img = new Image() // naturalWidth/Height are 0 until a real decode
    expect(await normalizeImageOrientation(img, 'jpeg')).toBeNull()
  })

  it('returns null when no canvas 2D context is available (jsdom)', async () => {
    // Force non-zero dimensions; jsdom has no canvas backend, so getContext
    // yields null and the helper must fall back rather than throw.
    const img = new Image()
    Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 80, configurable: true })
    expect(await normalizeImageOrientation(img, 'png')).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { rectToPdf, fontSizeToPt, hexToRgb01 } from './overlay-coords'
import type { OverlayObject } from './overlay-store'

const base: OverlayObject = { id: 'o1', page: 0, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.2 }

describe('overlay-coords', () => {
  it('maps a normalized rect to PDF points (origin bottom-left)', () => {
    const r = rectToPdf(base, 600, 800)
    expect(r).toEqual({ x: 60, width: 300, height: 160, yTop: 720, y: 560 })
  })

  it('maps font size fraction to points', () => {
    expect(fontSizeToPt({ ...base, fontSizePct: 0.05 }, 800)).toBe(40)
    expect(fontSizeToPt(base, 800)).toBeCloseTo(24) // default 0.03 * 800
  })

  it('parses hex colors to 0..1 rgb', () => {
    expect(hexToRgb01('#ff0000')).toEqual({ r: 1, g: 0, b: 0 })
    expect(hexToRgb01('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb01('bad')).toEqual({ r: 0, g: 0, b: 0 })
  })
})

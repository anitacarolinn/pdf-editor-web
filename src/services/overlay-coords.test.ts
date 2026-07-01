import { describe, it, expect } from 'vitest'
import { rectToPdf, rectToPdfRotated, fontSizeToPt, hexToRgb01 } from './overlay-coords'
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

describe('rectToPdfRotated', () => {
  // Media box 600x800. Sample rect: visual top-left (10%,10%), size (50%,20%).
  it('R=0 reduces to rectToPdf placement + baseline (yTop - size)', () => {
    const r = rectToPdfRotated(base, 600, 800, 0)
    // Image box matches rectToPdf (x, y, width, height)
    expect(r.x).toBe(60)
    expect(r.y).toBe(560)
    expect(r.width).toBe(300)
    expect(r.height).toBe(160)
    expect(r.rotate).toBe(0)
    // Text: size 0.03*800=24, baseline at yTop(720) - size = 696, x = 60
    expect(r.size).toBeCloseTo(24)
    expect(r.textX).toBe(60)
    expect(r.textY).toBeCloseTo(696)
  })

  it('R=90 maps visual rect into unrotated user space, rotate=90', () => {
    const r = rectToPdfRotated(base, 600, 800, 90)
    // VW=800, VH=600 → vw=400, vh=120, size=0.03*600=18
    expect(r.x).toBe(180)
    expect(r.y).toBe(80)
    expect(r.width).toBe(400)
    expect(r.height).toBe(120)
    expect(r.rotate).toBe(90)
    expect(r.size).toBeCloseTo(18)
    expect(r.textX).toBeCloseTo(78)
    expect(r.textY).toBe(80)
  })

  it('R=180 maps visual rect into unrotated user space, rotate=180', () => {
    const r = rectToPdfRotated(base, 600, 800, 180)
    expect(r.x).toBe(540)
    expect(r.y).toBe(240)
    expect(r.width).toBe(300)
    expect(r.height).toBe(160)
    expect(r.rotate).toBe(180)
    expect(r.size).toBeCloseTo(24)
    expect(r.textX).toBe(540)
    expect(r.textY).toBeCloseTo(104)
  })

  it('R=270 maps visual rect into unrotated user space, rotate=270', () => {
    const r = rectToPdfRotated(base, 600, 800, 270)
    expect(r.x).toBe(420)
    expect(r.y).toBe(720)
    expect(r.width).toBe(400)
    expect(r.height).toBe(120)
    expect(r.rotate).toBe(270)
    expect(r.size).toBeCloseTo(18)
    expect(r.textX).toBeCloseTo(522)
    expect(r.textY).toBe(720)
  })

  it('normalizes negative / >360 rotation angles', () => {
    expect(rectToPdfRotated(base, 600, 800, -270).rotate).toBe(90)
    expect(rectToPdfRotated(base, 600, 800, 450).rotate).toBe(90)
  })
})

import type { OverlayObject } from './overlay-store'

export function rectToPdf(o: OverlayObject, pageW: number, pageH: number) {
  const x = o.xPct * pageW
  const width = o.wPct * pageW
  const height = o.hPct * pageH
  const yTop = pageH * (1 - o.yPct)
  const y = yTop - height
  return { x, y, width, height, yTop }
}

export function fontSizeToPt(o: OverlayObject, pageH: number): number {
  return (o.fontSizePct ?? 0.03) * pageH
}

export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!m) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
  }
}

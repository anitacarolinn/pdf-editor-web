import type { OverlayObject } from './overlay-store'
import type { RectPct } from './markup-store'

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

/**
 * Rotation-aware placement of an overlay object into UNROTATED PDF user space.
 *
 * The overlay's xPct/yPct/wPct/hPct live in the VISUAL (displayed) frame, which is
 * how pdf.js renders the page after applying its `/Rotate` (clockwise). This maps
 * that visual rect back into unrotated user space (origin bottom-left, y-up) and
 * returns pdf-lib draw params, including a `rotate` (degrees, CCW about the anchor)
 * so the drawn content is upright in the visual frame.
 *
 * Derivation (verified by corner-matching at 0/90/180/270):
 *   Unrotated media box = W×H. /Rotate = R clockwise.
 *   Visual dims: R∈{0,180} → VW=W, VH=H ;  R∈{90,270} → VW=H, VH=W.
 *   V→U corner inversion:
 *     R=0:   Ux=Vx,    Uy=H−Vy
 *     R=90:  Ux=Vy,    Uy=Vx
 *     R=180: Ux=W−Vx,  Uy=Vy
 *     R=270: Ux=W−Vy,  Uy=H−Vx
 *   pdf-lib `rotate` (CCW in user space) that keeps content upright equals R.
 *   Image anchor = U-image of the visual BOTTOM-LEFT corner (vx, vy+vh).
 *   Text anchor  = U-image of the visual baseline-left point (vx, vy+size).
 *
 * R=0 reduces exactly to `rectToPdf` (x=Vx, y=H−Vy−h) plus the same text baseline
 * (yText = yTop − size), so existing behavior/tests are preserved.
 */
export function rectToPdfRotated(
  o: OverlayObject,
  pageW: number,
  pageH: number,
  rotationDeg: number,
) {
  const R = (((Math.round(rotationDeg) % 360) + 360) % 360) as 0 | 90 | 180 | 270
  const swap = R === 90 || R === 270
  const VW = swap ? pageH : pageW
  const VH = swap ? pageW : pageH

  const vx = o.xPct * VW
  const vy = o.yPct * VH
  const vw = o.wPct * VW
  const vh = o.hPct * VH

  // Visual text height (matches the DOM overlay, which sizes text against the
  // displayed/visual page height VH — not the unrotated media height).
  const size = (o.fontSizePct ?? 0.03) * VH

  // V → U corner inversion.
  const vToU = (x: number, y: number): { x: number; y: number } => {
    switch (R) {
      case 90:
        return { x: y, y: x }
      case 180:
        return { x: pageW - x, y }
      case 270:
        return { x: pageW - y, y: pageH - x }
      case 0:
      default:
        return { x, y: pageH - y }
    }
  }

  const rotate = R
  // Image draw box: anchor at U-image of visual bottom-left; width/height stay
  // in visual axes (pdf-lib's local +x/+y are re-oriented by `rotate`).
  const imgAnchor = vToU(vx, vy + vh)
  // Text baseline-left: `size` below the visual top edge.
  const textAnchor = vToU(vx, vy + size)

  return {
    // Image params
    x: imgAnchor.x,
    y: imgAnchor.y,
    width: vw,
    height: vh,
    rotate,
    // Text params
    size,
    textX: textAnchor.x,
    textY: textAnchor.y,
  }
}

/**
 * Rotation-aware placement of a visual-frame axis-aligned rectangle (percent)
 * into UNROTATED PDF user space, for pdf-lib drawRectangle. Same V→U inversion
 * as the image branch of rectToPdfRotated; anchor = visual bottom-left corner.
 */
export function rectPctToPdfRotated(
  rect: RectPct,
  pageW: number,
  pageH: number,
  rotationDeg: number,
) {
  const R = (((Math.round(rotationDeg) % 360) + 360) % 360) as 0 | 90 | 180 | 270
  const swap = R === 90 || R === 270
  const VW = swap ? pageH : pageW
  const VH = swap ? pageW : pageH

  const vx = rect.xPct * VW
  const vy = rect.yPct * VH
  const vw = rect.wPct * VW
  const vh = rect.hPct * VH

  const vToU = (x: number, y: number): { x: number; y: number } => {
    switch (R) {
      case 90:
        return { x: y, y: x }
      case 180:
        return { x: pageW - x, y }
      case 270:
        return { x: pageW - y, y: pageH - x }
      case 0:
      default:
        return { x, y: pageH - y }
    }
  }

  const anchor = vToU(vx, vy + vh) // visual bottom-left
  return { x: anchor.x, y: anchor.y, width: vw, height: vh, rotate: R }
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

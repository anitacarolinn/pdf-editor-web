import type { RectPct } from './markup-store'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Convert DOM client rects (e.g. from a Selection Range) into page-relative
 *  percentages against the page wrapper's bounding box. Zero-area rects are
 *  dropped (browsers emit spurious empties at line boundaries). */
export function clientRectsToPct(rects: Box[], wrapper: Box): RectPct[] {
  const out: RectPct[] = []
  for (const r of rects) {
    if (r.width <= 0 || r.height <= 0) continue
    out.push({
      xPct: (r.left - wrapper.left) / wrapper.width,
      yPct: (r.top - wrapper.top) / wrapper.height,
      wPct: r.width / wrapper.width,
      hPct: r.height / wrapper.height,
    })
  }
  return out
}

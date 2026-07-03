import { PDFDocument, StandardFonts, degrees as pdfDegrees, rgb } from 'pdf-lib'
import type { OverlayObject } from './overlay-store'
import { rectToPdfRotated, hexToRgb01, rectPctToPdfRotated } from './overlay-coords'
import type { MarkupObject } from './markup-store'

/**
 * Render a text object to a transparent PNG using a browser canvas, so ANY
 * script (中文, etc.) renders via the system fonts. Helvetica/WinAnsi in
 * pdf-lib cannot encode CJK, so drawText would throw. Returns null when no
 * canvas 2D context is available (e.g. jsdom in tests) — callers fall back to
 * drawText for that case.
 */
async function renderTextToPng(
  o: OverlayObject,
  wPt: number,
  hPt: number,
  sizePt: number,
): Promise<Uint8Array | null> {
  if (typeof document === 'undefined') return null
  const dpr = 2
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  canvas.width = Math.max(1, Math.ceil(wPt * dpr))
  canvas.height = Math.max(1, Math.ceil(hPt * dpr))
  const fontPx = sizePt * dpr
  ctx.font = `${fontPx}px "Helvetica Neue", Arial, "Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", sans-serif`
  ctx.fillStyle = o.color ?? '#000000'
  ctx.textBaseline = 'top'
  const lineHeight = fontPx * 1.28
  const maxW = canvas.width
  const lines: string[] = []
  for (const para of (o.text ?? '').split('\n')) {
    let line = ''
    for (const ch of para) {
      const test = line + ch
      if (line && ctx.measureText(test).width > maxW) {
        lines.push(line)
        line = ch
      } else {
        line = test
      }
    }
    lines.push(line)
  }
  let y = 0
  for (const line of lines) {
    ctx.fillText(line, 0, y)
    y += lineHeight
    if (y > canvas.height) break
  }
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return null
  return new Uint8Array(await blob.arrayBuffer())
}

export async function flattenObjects(
  bytes: Uint8Array,
  objects: OverlayObject[],
  markup: MarkupObject[] = [],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const pageCount = doc.getPageCount()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const o of objects) {
    if (o.page < 0 || o.page >= pageCount) continue
    const page = doc.getPage(o.page)
    const { width: pw, height: ph } = page.getSize()
    const rotationDeg = page.getRotation().angle
    const r = rectToPdfRotated(o, pw, ph, rotationDeg)
    const rotate = pdfDegrees(r.rotate)
    if (o.type === 'text') {
      // Rasterize via canvas so any language (incl. Chinese) renders; fall
      // back to Helvetica drawText when no canvas is available (test env).
      const png = await renderTextToPng(o, r.width, r.height, r.size)
      if (png) {
        const img = await doc.embedPng(png)
        page.drawImage(img, { x: r.x, y: r.y, width: r.width, height: r.height, rotate })
      } else {
        const c = hexToRgb01(o.color ?? '#000000')
        page.drawText(o.text ?? '', {
          x: r.textX,
          y: r.textY,
          size: r.size,
          font,
          color: rgb(c.r, c.g, c.b),
          rotate,
        })
      }
    } else if (o.type === 'image' && o.imageBytes) {
      const img =
        o.imageType === 'jpeg'
          ? await doc.embedJpg(o.imageBytes)
          : await doc.embedPng(o.imageBytes)
      page.drawImage(img, { x: r.x, y: r.y, width: r.width, height: r.height, rotate })
    }
  }

  // ── Markup: highlight (filled, semi-transparent), underline & strikethrough
  //    (thin bars). Text is already in the page content, so a 0.4-opacity fill
  //    reads like a highlighter. ──────────────────────────────────────────────
  for (const m of markup) {
    if (m.page < 0 || m.page >= pageCount) continue
    const page = doc.getPage(m.page)
    const { width: pw, height: ph } = page.getSize()
    const rotationDeg = page.getRotation().angle
    const c = hexToRgb01(m.color)
    const color = rgb(c.r, c.g, c.b)
    for (const rect of m.rects) {
      const r = rectPctToPdfRotated(rect, pw, ph, rotationDeg)
      const rotate = pdfDegrees(r.rotate)
      if (m.type === 'highlight') {
        page.drawRectangle({
          x: r.x, y: r.y, width: r.width, height: r.height, rotate,
          color, opacity: 0.4,
        })
      } else {
        // underline sits at the bottom of the rect; strikethrough at the middle.
        const barH = Math.max(1, r.height * 0.08)
        const yOffset = m.type === 'underline' ? 0 : r.height / 2 - barH / 2
        page.drawRectangle({
          x: r.x, y: r.y + yOffset, width: r.width, height: barH, rotate,
          color, opacity: 1,
        })
      }
    }
  }

  return doc.save()
}

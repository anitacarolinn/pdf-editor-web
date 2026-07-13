export interface NormalizedImage {
  bytes: Uint8Array
  type: 'png' | 'jpeg'
}

/**
 * Re-encode a decoded image through a canvas so the output pixels are already
 * in display orientation and carry NO EXIF metadata.
 *
 * Why: JPEGs (esp. phone photos) store an EXIF orientation tag. Browsers apply
 * it when rendering an <img>, so the editor preview looks upright — but
 * pdf-lib's embedJpg/embedPng draw the RAW pixels and ignore EXIF, so the
 * exported PDF would show the image rotated/flipped. Drawing the already-
 * oriented <img> to a canvas bakes the orientation into the pixels; the canvas
 * export then matches exactly what the user saw in the editor.
 *
 * `img` must be fully loaded (naturalWidth/Height reflect the oriented size).
 * Returns null when no canvas 2D context is available (e.g. jsdom in tests) so
 * callers can fall back to the original bytes.
 */
export async function normalizeImageOrientation(
  img: HTMLImageElement,
  type: 'png' | 'jpeg',
): Promise<NormalizedImage | null> {
  if (typeof document === 'undefined') return null
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, w, h)
  const mime = type === 'jpeg' ? 'image/jpeg' : 'image/png'
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, 0.92))
  if (!blob) return null
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type }
}

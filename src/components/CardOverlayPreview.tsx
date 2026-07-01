import { useEffect, useRef, useState } from 'react'
import { useOverlayStore, objectsForPage } from '../services/overlay-store'
import type { OverlayObject } from '../services/overlay-store'

/**
 * Read-only render of a page's overlay objects (text / images), sized to fill
 * the thumbnail. This is what makes edits added in the modal show up on the
 * home grid — without it, Save & Close keeps the objects in the store but the
 * grid only draws the raw page canvas. Non-interactive (pointer-events: none).
 */
export default function CardOverlayPreview({ page }: { page: number }) {
  const objects = useOverlayStore((s) => s.objects)
  const pageObjects = objectsForPage(objects, page)
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {size.w > 0 &&
        pageObjects.map((obj) => (
          <PreviewObject key={obj.id} obj={obj} wPx={size.w} hPx={size.h} />
        ))}
    </div>
  )
}

function PreviewObject({ obj, wPx, hPx }: { obj: OverlayObject; wPx: number; hPx: number }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (obj.type !== 'image' || !obj.imageBytes) return
    const mime = obj.imageType === 'jpeg' ? 'image/jpeg' : 'image/png'
    const u = URL.createObjectURL(new Blob([obj.imageBytes as BlobPart], { type: mime }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [obj.type, obj.imageBytes, obj.imageType])

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${obj.xPct * wPx}px`,
    top: `${obj.yPct * hPx}px`,
    width: `${obj.wPct * wPx}px`,
    height: `${obj.hPct * hPx}px`,
    overflow: 'hidden',
  }

  if (obj.type === 'text') {
    return (
      <div
        style={{
          ...style,
          fontSize: `${(obj.fontSizePct ?? 0.03) * hPx}px`,
          color: obj.color ?? '#000000',
          lineHeight: 1.1,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {obj.text}
      </div>
    )
  }
  return url ? (
    <img src={url} alt="" style={{ ...style, objectFit: 'contain', display: 'block' }} />
  ) : null
}

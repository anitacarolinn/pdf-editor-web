import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageToCanvas } from '../services/render-service'

export default function PageCanvas({
  doc,
  pageNumber,
  scale,
  className,
  fluid,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  scale: number
  className?: string
  /** Grid thumbnails: size by CSS (width:100%) instead of inline px, so the
   *  page always fits the card and is never clipped. */
  fluid?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) {
      const handle = renderPageToCanvas(doc, pageNumber, ref.current, scale, { fluid })
      handle?.done?.catch?.(() => {})
      return () => handle?.cancel?.()
    }
  }, [doc, pageNumber, scale, fluid])
  return <canvas ref={ref} className={className} />
}

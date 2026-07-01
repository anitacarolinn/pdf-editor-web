import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageToCanvas } from '../services/render-service'

export default function PageCanvas({
  doc,
  pageNumber,
  scale,
  className,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  scale: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) {
      const handle = renderPageToCanvas(doc, pageNumber, ref.current, scale)
      handle?.done?.catch?.(() => {})
      return () => handle?.cancel?.()
    }
  }, [doc, pageNumber, scale])
  return <canvas ref={ref} className={className} />
}

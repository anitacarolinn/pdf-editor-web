import React, { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import PageCanvas from './PageCanvas'
import CardOverlayPreview from './CardOverlayPreview'

export type CardOpenTool = 'preview' | 'text' | 'picture'

export interface PageGridProps {
  doc: PDFDocumentProxy | null
  pageCount: number
  selectedPages: Set<number>
  onCardClick: (i: number, e: React.MouseEvent) => void
  onCardOpen: (i: number, tool: CardOpenTool) => void
  /** Called when the "Add picture" hover button is clicked; triggers the file
   *  picker synchronously so the user-gesture chain is preserved. */
  onCardPicture: (i: number) => void
  onHoverRotate: (i: number) => void
  onHoverDelete: (i: number) => void
  dragFrom: React.MutableRefObject<number | null>
  onDrop: (from: number, to: number) => void
}

export default function PageGrid({
  doc,
  pageCount,
  selectedPages,
  onCardClick,
  onCardOpen,
  onCardPicture,
  onHoverRotate,
  onHoverDelete,
  dragFrom,
  onDrop,
}: PageGridProps) {
  // Local display order (display position -> page index). Reset to identity
  // whenever the document reloads (open / edit / reorder commit). Reordering
  // this array animates the cards' positions via motion `layout` before the
  // change is committed to the PDF bytes.
  const [order, setOrder] = useState<number[]>([])
  const [dragPos, setDragPos] = useState<number | null>(null)
  const [overPos, setOverPos] = useState<number | null>(null)

  useEffect(() => {
    setOrder(Array.from({ length: pageCount }, (_, i) => i))
  }, [doc, pageCount])

  if (!doc) {
    return (
      <div className="empty-state">
        <svg className="empty-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M28 4v10h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="empty-label">Open a PDF to get started</span>
      </div>
    )
  }

  return (
    <div className="page-grid">
      {order.map((pageIdx, pos) => {
        const isSelected = selectedPages.has(pageIdx)
        const isDragging = dragPos === pos
        const isOver = overPos === pos && dragPos !== null && dragPos !== pos
        return (
          <div
            key={pageIdx}
            data-testid="thumb"
            draggable
            className={`page-card${isSelected ? ' page-card--selected' : ''}${isOver ? ' page-card--drop-target' : ''}`}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            onClick={(e) => onCardClick(pageIdx, e)}
            onDoubleClick={() => onCardOpen(pageIdx, 'preview')}
            onDragStart={() => { dragFrom.current = pageIdx; setDragPos(pos) }}
            onDragOver={(e) => { e.preventDefault(); setOverPos(pos) }}
            onDragEnd={() => { setDragPos(null); setOverPos(null) }}
            onDrop={() => {
              const from = dragFrom.current
              setDragPos(null)
              setOverPos(null)
              if (from !== null && from !== pageIdx) {
                // Single clean reorder: commit to the PDF bytes; the reload
                // repositions once (no optimistic slide → no double animation).
                onDrop(from, pageIdx)
              }
              dragFrom.current = null
            }}
          >
            {/* Thumbnail canvas */}
            <div className="page-card__canvas-wrap">
              <PageCanvas
                doc={doc}
                pageNumber={pageIdx + 1}
                scale={0.6}
                className="page-card__canvas"
                fluid
              />
              {/* Read-only preview of overlay text/images so edits made in the
                  modal are visible on the home grid too. */}
              <CardOverlayPreview page={pageIdx} />
              {/* Per-card hover toolbar */}
              <div className="card-hover-toolbar" role="toolbar" aria-label={`Page ${pageIdx + 1} actions`}>
                <button
                  className="card-hover-btn"
                  aria-label="Preview page"
                  title="Preview page"
                  onClick={(e) => { e.stopPropagation(); onCardOpen(pageIdx, 'preview') }}
                >
                  👁
                </button>
                <button
                  className="card-hover-btn"
                  aria-label="Add text to page"
                  title="Add text to page"
                  onClick={(e) => { e.stopPropagation(); onCardOpen(pageIdx, 'text') }}
                >
                  T
                </button>
                <button
                  className="card-hover-btn"
                  aria-label="Add picture to page"
                  title="Add picture to page"
                  onClick={(e) => { e.stopPropagation(); onCardPicture(pageIdx) }}
                >
                  🖼
                </button>
                <button
                  className="card-hover-btn"
                  aria-label="Rotate page"
                  title="Rotate page"
                  onClick={(e) => { e.stopPropagation(); onHoverRotate(pageIdx) }}
                >
                  ↻
                </button>
                <button
                  className="card-hover-btn card-hover-btn--danger"
                  aria-label="Remove page"
                  title="Remove page"
                  onClick={(e) => { e.stopPropagation(); onHoverDelete(pageIdx) }}
                >
                  🗑
                </button>
              </div>
            </div>
            {/* Page label */}
            <span className="page-card__label">page {pos + 1}</span>
          </div>
        )
      })}
    </div>
  )
}

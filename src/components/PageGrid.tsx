import React from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import PageCanvas from './PageCanvas'

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
      {Array.from({ length: pageCount }, (_, i) => {
        const isSelected = selectedPages.has(i)
        return (
          <div
            key={i}
            data-testid="thumb"
            draggable
            className={`page-card${isSelected ? ' page-card--selected' : ''}`}
            onClick={(e) => onCardClick(i, e)}
            onDoubleClick={() => onCardOpen(i, 'preview')}
            onDragStart={() => { dragFrom.current = i }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom.current !== null && dragFrom.current !== i) {
                onDrop(dragFrom.current, i)
              }
              dragFrom.current = null
            }}
          >
            {/* Thumbnail canvas */}
            <div className="page-card__canvas-wrap">
              <PageCanvas
                doc={doc}
                pageNumber={i + 1}
                scale={0.6}
                className="page-card__canvas"
                fluid
              />
              {/* Per-card hover toolbar */}
              <div className="card-hover-toolbar" role="toolbar" aria-label={`Page ${i + 1} actions`}>
                <button
                  className="card-hover-btn"
                  aria-label="Preview page"
                  title="Preview page"
                  onClick={(e) => { e.stopPropagation(); onCardOpen(i, 'preview') }}
                >
                  👁
                </button>
                <button
                  className="card-hover-btn"
                  aria-label="Add text to page"
                  title="Add text to page"
                  onClick={(e) => { e.stopPropagation(); onCardOpen(i, 'text') }}
                >
                  T
                </button>
                <button
                  className="card-hover-btn"
                  aria-label="Add picture to page"
                  title="Add picture to page"
                  onClick={(e) => { e.stopPropagation(); onCardPicture(i) }}
                >
                  🖼
                </button>
                <button
                  className="card-hover-btn"
                  aria-label="Rotate page"
                  title="Rotate page"
                  onClick={(e) => { e.stopPropagation(); onHoverRotate(i) }}
                >
                  ↻
                </button>
                <button
                  className="card-hover-btn card-hover-btn--danger"
                  aria-label="Remove page"
                  title="Remove page"
                  onClick={(e) => { e.stopPropagation(); onHoverDelete(i) }}
                >
                  🗑
                </button>
              </div>
            </div>
            {/* Page label */}
            <span className="page-card__label">page {i + 1}</span>
          </div>
        )
      })}
    </div>
  )
}

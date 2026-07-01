import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import PageCanvas from './PageCanvas'
import OverlayLayer from './OverlayLayer'
import { useOverlayStore } from '../services/overlay-store'

export interface PageEditModalProps {
  /** 0-based page index currently being previewed */
  page: number
  pageCount: number
  doc: PDFDocumentProxy
  zoom: number
  onZoom: (z: number | 'fit') => void
  /** Called with 1-based page number when user navigates */
  onGo: (p: number) => void
  onClose: () => void
  onAddText: () => void
  onAddPicture: () => void
  onApply: () => void
}

export default function PageEditModal({
  page,
  pageCount,
  doc,
  zoom,
  onZoom,
  onGo,
  onClose,
  onAddText,
  onAddPicture,
  onApply,
}: PageEditModalProps) {
  const objectCount = useOverlayStore((s) => s.objects.length)

  // Measure the rendered canvas to size OverlayLayer correctly
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setCanvasSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Escape key closes the modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // 1-based current page for display/navigation
  const currentPage = page + 1

  const clamp = useCallback(
    (p: number) => Math.min(Math.max(1, p), pageCount),
    [pageCount],
  )

  const handleGo = useCallback(
    (p: number) => {
      const clamped = clamp(p)
      onGo(clamped)
    },
    [clamp, onGo],
  )

  const commitInput = useCallback(
    (raw: string) => {
      const p = clamp(Number(raw))
      if (p !== currentPage) handleGo(p)
    },
    [clamp, currentPage, handleGo],
  )

  // Prevent backdrop click from triggering when clicking on content
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  return (
    <div
      data-testid="modal-backdrop"
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'stretch',
      }}
    >
      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div
        className="modal-header"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(30, 30, 36, 0.97)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* Zoom controls */}
        <button
          aria-label="Zoom out"
          className="modal-ctrl-btn"
          onClick={() => onZoom(Math.max(0.25, zoom - 0.25))}
          style={{ fontSize: '16px', lineHeight: 1 }}
        >
          −
        </button>
        <span
          className="modal-zoom-label"
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500,
            minWidth: '38px',
            textAlign: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          aria-label="Zoom in"
          className="modal-ctrl-btn"
          onClick={() => onZoom(Math.min(5, zoom + 0.25))}
          style={{ fontSize: '16px', lineHeight: 1 }}
        >
          +
        </button>
        <button
          aria-label="Fit width"
          className="modal-ctrl-btn"
          onClick={() => onZoom('fit')}
          style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.02em', padding: '0 8px', width: 'auto' }}
        >
          Fit
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Add text button */}
        <button
          aria-label="Add text"
          className="modal-action-btn"
          onClick={onAddText}
          style={{
            background: 'rgba(99,102,241,0.15)',
            color: '#a5b4fc',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '5px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Add text
        </button>

        {/* Add picture button */}
        <button
          aria-label="Add picture"
          className="modal-action-btn"
          onClick={onAddPicture}
          style={{
            background: 'rgba(99,102,241,0.15)',
            color: '#a5b4fc',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '5px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Add picture
        </button>

        {/* Apply button */}
        <button
          aria-label="Apply"
          className="modal-action-btn modal-action-btn--apply"
          disabled={objectCount === 0}
          onClick={onApply}
          style={{
            background: objectCount > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
            color: objectCount > 0 ? '#86efac' : 'rgba(255,255,255,0.3)',
            border: `1px solid ${objectCount > 0 ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '5px',
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: objectCount > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Apply
        </button>

        {/* Spacer pushes X to the right */}
        <div style={{ flex: 1 }} />

        {/* Close button */}
        <button
          aria-label="Close"
          className="modal-close-btn"
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '5px',
            color: 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: 1,
            padding: '4px 10px',
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Page canvas area with prev/next arrows ─────────────────── */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous page arrow — far left */}
        <button
          aria-label="Previous page"
          className="modal-nav-btn"
          disabled={currentPage <= 1}
          onClick={() => handleGo(currentPage - 1)}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            fontSize: '28px',
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '8px',
            color: currentPage <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            padding: '12px 10px',
            lineHeight: 1,
          }}
        >
          ◀
        </button>

        {/* Canvas + overlay container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            overflow: 'auto',
            padding: '24px 72px',
          }}
        >
          <div
            ref={canvasWrapRef}
            style={{
              position: 'relative',
              display: 'inline-block',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <PageCanvas
              doc={doc}
              pageNumber={currentPage}
              scale={zoom}
            />
            {canvasSize.width > 0 && canvasSize.height > 0 && (
              <OverlayLayer
                page={page}
                pageWidthPx={canvasSize.width}
                pageHeightPx={canvasSize.height}
              />
            )}
          </div>
        </div>

        {/* Next page arrow — far right */}
        <button
          aria-label="Next page"
          className="modal-nav-btn"
          disabled={currentPage >= pageCount}
          onClick={() => handleGo(currentPage + 1)}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            fontSize: '28px',
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '8px',
            color: currentPage >= pageCount ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
            cursor: currentPage >= pageCount ? 'not-allowed' : 'pointer',
            padding: '12px 10px',
            lineHeight: 1,
          }}
        >
          ▶
        </button>
      </div>

      {/* ── Bottom page indicator ──────────────────────────────────── */}
      <div
        className="modal-footer"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: 'rgba(30, 30, 36, 0.97)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.6)',
          fontWeight: 400,
        }}
      >
        <span>Page</span>
        <input
          aria-label="Current page"
          type="number"
          min={1}
          max={pageCount}
          defaultValue={currentPage}
          key={currentPage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitInput((e.target as HTMLInputElement).value)
          }}
          onBlur={(e) => commitInput(e.target.value)}
          style={{
            width: '44px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '4px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '13px',
            fontWeight: 500,
            padding: '2px 4px',
            outline: 'none',
          }}
        />
        <span>/ {pageCount}</span>
      </div>
    </div>
  )
}

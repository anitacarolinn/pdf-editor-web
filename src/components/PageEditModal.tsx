import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import PageCanvas from './PageCanvas'
import OverlayLayer from './OverlayLayer'
import { useOverlayStore } from '../services/overlay-store'
import type { OverlayObject } from '../services/overlay-store'
import {
  IconUndo,
  IconRedo,
  IconInsertBlank,
  IconDelete,
  IconDuplicate,
  IconRotateLeft,
  IconRotateRight,
  IconMoveBefore,
  IconMoveAfter,
  IconZoomOut,
  IconZoomIn,
  IconAddText,
  IconAddPicture,
  IconSign,
} from './icons'
import { useI18n } from '../services/i18n'
import MarkupLayer from './MarkupLayer'
import SelectionPopup from './SelectionPopup'
import SearchBar from './SearchBar'
import { renderTextLayer, searchDocument, extractDocumentText } from '../services/text-service'
import type { SearchHit } from '../services/text-service'
import { useMarkupStore } from '../services/markup-store'
import type { MarkupObject, MarkupType } from '../services/markup-store'
import { clientRectsToPct } from '../services/selection-util'
import { downloadText } from '../services/file-io'

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
  onSign: () => void
  onApply: () => void
  // Page-scoped structural operations
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onInsert: () => void
  onDeletePage: () => void
  onDuplicate: () => void
  onRotateL: () => void
  onRotateR: () => void
  onMoveBefore: () => void
  onMoveAfter: () => void
}

// ── Toolbar button: icon above label ────────────────────────────────────────
function ToolBtn({
  label,
  icon,
  onClick,
  disabled = false,
  emphasized = false,
}: {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  emphasized?: boolean
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '8px 10px 6px',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled
          ? '#c0c0c8'
          : emphasized
          ? '#111827'
          : '#374151',
        opacity: disabled ? 0.45 : 1,
        fontWeight: emphasized ? 700 : 500,
        minWidth: '56px',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
        {icon}
      </span>
      <span style={{ fontSize: '11px', lineHeight: 1.2, whiteSpace: 'nowrap', userSelect: 'none' }}>
        {label}
      </span>
    </button>
  )
}

// ── Thin vertical divider in toolbar ────────────────────────────────────────
function Divider() {
  return (
    <div
      aria-hidden
      style={{
        width: '1px',
        height: '40px',
        background: '#e0e0e6',
        flexShrink: 0,
        margin: '0 2px',
        alignSelf: 'center',
      }}
    />
  )
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
  onSign,
  onApply,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onInsert,
  onDeletePage,
  onDuplicate,
  onRotateL,
  onRotateR,
  onMoveBefore,
  onMoveAfter,
}: PageEditModalProps) {
  const { t } = useI18n()

  // Snapshot overlay objects when the modal mounts.
  // Cancel restores from snapshot; Restore restores but stays open.
  // Structural page ops (rotate, delete, etc.) remain undoable via undo history.
  const mountSnapshot = useRef<OverlayObject[]>([])
  const markupSnapshot = useRef<MarkupObject[]>([])
  useEffect(() => {
    mountSnapshot.current = useOverlayStore.getState().objects
    markupSnapshot.current = useMarkupStore.getState().objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — run only on mount

  const handleCancel = useCallback(() => {
    useOverlayStore.setState({ objects: mountSnapshot.current })
    useMarkupStore.setState({ objects: markupSnapshot.current })
    onClose()
  }, [onClose])

  const handleRestore = useCallback(() => {
    useOverlayStore.setState({ objects: mountSnapshot.current })
    useMarkupStore.setState({ objects: markupSnapshot.current })
  }, [])

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

  // Escape key closes the modal (restores snapshot then closes)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleCancel])

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

  const commitZoom = useCallback(
    (raw: string) => {
      const pct = Number(raw)
      if (!Number.isFinite(pct) || pct <= 0) return
      onZoom(Math.min(5, Math.max(0.25, pct / 100)))
    },
    [onZoom],
  )

  // Scroll region + the page's intrinsic point size, for fit-to-width.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pageDims, setPageDims] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    let active = true
    const pending = (doc as { getPage?: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number } }> })?.getPage?.(currentPage)
    if (!pending || typeof pending.then !== 'function') return
    pending
      .then((p) => {
        const vp = p.getViewport({ scale: 1 })
        if (active) setPageDims({ w: vp.width, h: vp.height })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [doc, currentPage])

  // Fit-to-width: page fills the available width (reading mode).
  const computeFitWidth = useCallback(() => {
    const el = scrollRef.current
    if (!el || !pageDims) return 1
    return Math.max(0.1, Math.min(5, (el.clientWidth - 80) / pageDims.w))
  }, [pageDims])

  // The preview opens at 100% (default zoom = 1). Fit-to-width is available on
  // demand via the "Fit" button, but is no longer forced on open.
  // fitActive = the current zoom equals fit-width (so the button offers "Original").
  const fitActive = !!(pageDims && scrollRef.current) && Math.abs(zoom - computeFitWidth()) < 0.02

  // Prevent backdrop click from triggering when clicking on content
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) handleCancel()
    },
    [handleCancel],
  )

  const atFirst = currentPage <= 1
  const atLast = currentPage >= pageCount

  // ── Text layer: build pdf.js selectable spans over the canvas ──────────────
  const textLayerRef = useRef<HTMLDivElement>(null)
  // null = not yet determined; true/false once the text layer has rendered.
  // false means the page produced no selectable text (likely scanned/image).
  const [pageHasText, setPageHasText] = useState<boolean | null>(null)
  const [scannedInfo, setScannedInfo] = useState(false)
  useEffect(() => {
    const el = textLayerRef.current
    if (!el) return
    // New page/zoom: reset detection and dismiss any stale scanned-info banner.
    setPageHasText(null)
    setScannedInfo(false)
    const pending = (doc as unknown as { getPage?: (n: number) => Promise<never> })?.getPage?.(currentPage)
    if (!pending || typeof (pending as { then?: unknown }).then !== 'function') return
    let cancelled = false
    let handle: { cancel(): void; done: Promise<void> } | null = null
    ;(pending as Promise<never>).then((p) => {
      if (cancelled) return
      handle = renderTextLayer(p, zoom, el)
      handle.done.then(
        () => { if (!cancelled) setPageHasText(el.querySelectorAll('span').length > 0) },
        () => {},
      )
    }).catch(() => {})
    return () => {
      cancelled = true
      handle?.cancel()
    }
  }, [doc, currentPage, zoom])

  // Auto-hide the scanned-PDF info banner a few seconds after it appears.
  useEffect(() => {
    if (!scannedInfo) return
    const id = setTimeout(() => setScannedInfo(false), 4000)
    return () => clearTimeout(id)
  }, [scannedInfo])

  // Show the info banner when the user tries to select on a text-less page.
  const handlePageMouseDown = useCallback(() => {
    if (pageHasText === false) setScannedInfo(true)
  }, [pageHasText])

  // ── Selection popup ────────────────────────────────────────────────────────
  const [popup, setPopup] = useState<{ x: number; y: number; text: string } | null>(null)
  const handleSelection = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString() ?? ''
    if (!sel || sel.isCollapsed || !text.trim() || !textLayerRef.current) {
      setPopup(null)
      return
    }
    // Only react to selections inside our text layer. A selection/click
    // elsewhere should dismiss any stale popup left open from before.
    if (!textLayerRef.current.contains(sel.anchorNode)) { setPopup(null); return }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setPopup({ x: rect.left + rect.width / 2, y: rect.top - 6, text })
  }, [])
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [handleSelection])

  const addMarkupFromSelection = useCallback((type: MarkupType, color: string) => {
    const sel = window.getSelection()
    const wrap = canvasWrapRef.current
    if (!sel || sel.isCollapsed || !wrap) return
    const wrapBox = wrap.getBoundingClientRect()
    const clientRects = Array.from(sel.getRangeAt(0).getClientRects())
    const rects = clientRectsToPct(clientRects, wrapBox)
    if (rects.length) useMarkupStore.getState().addMarkup(page, type, color, rects)
    sel.removeAllRanges()
    setPopup(null)
  }, [page])

  const copySelection = useCallback(() => {
    const text = window.getSelection()?.toString() ?? ''
    if (text) navigator.clipboard?.writeText(text).catch(() => {})
    setPopup(null)
  }, [])

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [hitIndex, setHitIndex] = useState(-1)
  useEffect(() => {
    if (!searchOpen || !query) { setHits([]); setHitIndex(-1); return }
    let active = true
    searchDocument(doc as never, query).then((h) => {
      if (!active) return
      setHits(h)
      setHitIndex(h.length ? 0 : -1)
      if (h.length) onGo(h[0].pageIndex + 1)
    }).catch(() => {})
    return () => { active = false }
  }, [searchOpen, query, doc, onGo])

  const gotoHit = useCallback((next: number) => {
    if (!hits.length) return
    const i = (next + hits.length) % hits.length
    setHitIndex(i)
    onGo(hits[i].pageIndex + 1)
  }, [hits, onGo])

  // Ctrl+F opens search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ── Extract text ─────────────────────────────────────────────────────────
  const handleExtract = useCallback(async () => {
    const text = await extractDocumentText(doc as never)
    downloadText(text, 'extracted-text.txt')
  }, [doc])

  // ── Copy all text (whole document) to the clipboard ────────────────────────
  const handleCopyAll = useCallback(async () => {
    const text = await extractDocumentText(doc as never)
    if (!text.trim()) return
    try { await navigator.clipboard?.writeText(text) } catch { /* ignore */ }
  }, [doc])

  return (
    <div
      data-testid="modal-backdrop"
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'stretch',
      }}
    >
      {/* ── Top icon-above-label toolbar ─────────────────────────────── */}
      <div
        className="modal-header"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '0',
          minHeight: '68px',
        }}
      >
        {/* Left group: history + page structure */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <ToolBtn label={t.emUndo} icon={<IconUndo />} onClick={onUndo} disabled={!canUndo} />
          <ToolBtn label={t.emRedo} icon={<IconRedo />} onClick={onRedo} disabled={!canRedo} />
          <Divider />
          <ToolBtn label={t.emNewPage} icon={<IconInsertBlank />} onClick={onInsert} emphasized />
          <ToolBtn label={t.emDeletePage} icon={<IconDelete />} onClick={onDeletePage} disabled={pageCount <= 1} />
          <ToolBtn label={t.emDuplicate} icon={<IconDuplicate />} onClick={onDuplicate} />
          <Divider />
          <ToolBtn label={t.emRotateLeft} icon={<IconRotateLeft />} onClick={onRotateL} />
          <ToolBtn label={t.emRotateRight} icon={<IconRotateRight />} onClick={onRotateR} />
          <Divider />
          <ToolBtn label={t.emMoveBefore} icon={<IconMoveBefore />} onClick={onMoveBefore} disabled={atFirst} />
          <ToolBtn label={t.emMoveAfter} icon={<IconMoveAfter />} onClick={onMoveAfter} disabled={atLast} />
        </div>

        {/* Center group: zoom + add text/picture */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <Divider />
          {/* Zoom cluster */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', gap: '0' }}>
            <button
              aria-label={t.emZoomOut}
              onClick={() => onZoom(Math.max(0.25, Math.round((zoom - 0.1) * 100) / 100))}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px', padding: '8px 8px 6px', background: 'transparent', border: 'none',
                borderRadius: '6px', cursor: 'pointer', color: '#374151', minWidth: '52px',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                <IconZoomOut />
              </span>
              <span style={{ fontSize: '11px', lineHeight: 1.2, whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 500 }}>{t.emZoomOut}</span>
            </button>

            {/* Typeable zoom % field */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', padding: '3px 6px', margin: '0 4px' }}>
              <input
                aria-label={t.emZoomLevel}
                type="number"
                min={25}
                max={500}
                defaultValue={Math.round(zoom * 100)}
                key={`z${Math.round(zoom * 100)}`}
                onKeyDown={(e) => { if (e.key === 'Enter') commitZoom((e.target as HTMLInputElement).value) }}
                onBlur={(e) => commitZoom(e.target.value)}
                style={{
                  width: '42px', textAlign: 'center', background: 'transparent', border: 'none',
                  color: '#111827', fontSize: '12px', fontWeight: 600, outline: 'none',
                }}
              />
              <span style={{ color: '#6b7280', fontSize: '12px' }}>%</span>
            </div>

            <button
              aria-label={t.emZoomIn}
              onClick={() => onZoom(Math.min(5, Math.round((zoom + 0.1) * 100) / 100))}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px', padding: '8px 8px 6px', background: 'transparent', border: 'none',
                borderRadius: '6px', cursor: 'pointer', color: '#374151', minWidth: '52px',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                <IconZoomIn />
              </span>
              <span style={{ fontSize: '11px', lineHeight: 1.2, whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 500 }}>{t.emZoomIn}</span>
            </button>

            <button
              aria-label={t.emFitWidthLabel}
              onClick={() => {
                // Toggle: if already at fit-width, snap back to original 100%.
                const fw = computeFitWidth()
                onZoom(Math.abs(zoom - fw) < 0.02 ? 1 : fw)
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px', padding: '8px 10px 6px', border: 'none',
                borderRadius: '6px', cursor: 'pointer', minWidth: '40px',
                background: fitActive ? '#fef3c7' : 'transparent',
                color: fitActive ? '#b45309' : '#374151',
              }}
              onMouseEnter={(e) => { if (!fitActive) (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = fitActive ? '#fef3c7' : 'transparent' }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, height: 20, display: 'flex', alignItems: 'center' }}>⊟</span>
              <span style={{ fontSize: '11px', lineHeight: 1.2, whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 500 }}>{fitActive ? t.emOriginal : t.emFit}</span>
            </button>
          </div>
          <Divider />
          <ToolBtn label={t.emAddText} icon={<IconAddText />} onClick={onAddText} />
          <ToolBtn label={t.emAddPicture} icon={<IconAddPicture />} onClick={onAddPicture} />
          <ToolBtn label={t.emSign} icon={<IconSign />} onClick={onSign} />
          <ToolBtn label={t.tlSearch} icon={<span style={{ fontSize: 16 }}>🔍</span>} onClick={() => setSearchOpen(true)} />
          <ToolBtn label={t.tlExtractText} icon={<span style={{ fontSize: 16 }}>📄</span>} onClick={handleExtract} />
          <ToolBtn label={t.tlCopyAll} icon={<span style={{ fontSize: 16 }}>📋</span>} onClick={handleCopyAll} />
        </div>
      </div>

      {/* ── Info banner at the bottom edge of the header (scanned/no-text) ─ */}
      {scannedInfo && (
        <div
          role="status"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: '#fef3c7',
            color: '#92400e',
            borderBottom: '1px solid #fde68a',
            fontSize: '13px',
            flexShrink: 0,
          }}
        >
          <span>ℹ️ {t.tlNoTextInfo}</span>
          <button
            aria-label={t.infoClose}
            onClick={() => setScannedInfo(false)}
            style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page canvas area with prev/next arrows ─────────────────────── */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          background: '#f0f0f2',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous page arrow */}
        <button
          aria-label={t.emPrevPage}
          disabled={atFirst}
          onClick={() => handleGo(currentPage - 1)}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            fontSize: '22px',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            color: atFirst ? '#d1d5db' : '#374151',
            cursor: atFirst ? 'not-allowed' : 'pointer',
            padding: '10px 8px',
            lineHeight: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          ◀
        </button>

        {/* Canvas + overlay container */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            alignItems: 'safe center',
            justifyContent: 'safe center',
            flex: 1,
            height: '100%',
            overflow: 'auto',
            padding: '32px 72px',
          }}
        >
          <div
            ref={canvasWrapRef}
            data-testid="page-surface"
            onMouseDown={handlePageMouseDown}
            style={{
              position: 'relative',
              display: 'inline-block',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              borderRadius: '2px',
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <PageCanvas
              doc={doc}
              pageNumber={currentPage}
              scale={zoom}
            />
            <div ref={textLayerRef} data-testid="text-layer" style={{ position: 'absolute', inset: 0 }} />
            <MarkupLayer page={page} />
            {canvasSize.width > 0 && canvasSize.height > 0 && (
              <OverlayLayer
                page={page}
                pageWidthPx={canvasSize.width}
                pageHeightPx={canvasSize.height}
              />
            )}
          </div>
        </div>

        {/* Next page arrow */}
        <button
          aria-label={t.emNextPage}
          disabled={atLast}
          onClick={() => handleGo(currentPage + 1)}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            fontSize: '22px',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            color: atLast ? '#d1d5db' : '#374151',
            cursor: atLast ? 'not-allowed' : 'pointer',
            padding: '10px 8px',
            lineHeight: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          ▶
        </button>

        {searchOpen && (
          <SearchBar
            query={query}
            totalMatches={hits.length}
            currentIndex={hitIndex}
            onQueryChange={setQuery}
            onPrev={() => gotoHit(hitIndex - 1)}
            onNext={() => gotoHit(hitIndex + 1)}
            onClose={() => { setSearchOpen(false); setQuery('') }}
          />
        )}
      </div>

      {/* ── Bottom bar: page indicator (left) + action footer (right) ─── */}
      <div
        className="modal-footer"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      >
        {/* Page indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280', fontWeight: 400 }}>
          <span>{t.emPage}</span>
          <input
            aria-label={t.emCurrentPage}
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
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              color: '#111827',
              fontSize: '13px',
              fontWeight: 500,
              padding: '2px 4px',
              outline: 'none',
            }}
          />
          <span>/ {pageCount}</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Restore — light, restores overlay snapshot but stays open */}
          <button
            aria-label={t.emRestore}
            onClick={handleRestore}
            style={{
              padding: '8px 18px',
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
          >
            {t.emRestore}
          </button>

          {/* Cancel — discards overlay changes, closes modal */}
          <button
            aria-label={t.emCancel}
            onClick={handleCancel}
            style={{
              padding: '8px 18px',
              background: '#fff',
              border: '1px solid #9ca3af',
              borderRadius: '8px',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
          >
            {t.emCancel}
          </button>

          {/* Save & Close — keeps edits, closes modal */}
          <button
            aria-label="Save &amp; Close"
            onClick={onApply}
            style={{
              padding: '8px 22px',
              background: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#ef4444' }}
          >
            {t.emSaveClose}
          </button>
        </div>
      </div>

      <SelectionPopup
        pos={popup ? { x: popup.x, y: popup.y } : null}
        selectedText={popup?.text ?? ''}
        onCopy={copySelection}
        onMark={addMarkupFromSelection}
        onSearch={() => { if (popup) { setQuery(popup.text); setSearchOpen(true); setPopup(null) } }}
        onDismiss={() => setPopup(null)}
      />
    </div>
  )
}

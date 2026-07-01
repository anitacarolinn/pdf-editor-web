import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Toolbar from './components/Toolbar'
import ThumbnailRail from './components/ThumbnailRail'
import Viewer from './components/Viewer'
import PageCanvas from './components/PageCanvas'
import PreviewControls from './components/PreviewControls'
import OverlayLayer from './components/OverlayLayer'
import { useDocumentStore } from './services/document-store'
import { useOverlayStore } from './services/overlay-store'
import { flattenObjects } from './services/flatten'
import { readFileAsBytes } from './services/file-io'
import { loadRenderDoc } from './services/render-service'
import {
  getPageCount,
  rotatePages,
  duplicatePages,
  deletePages,
  insertBlankPage,
  mergePdfs,
  extractPages,
  replacePage,
  splitPdf,
  reorderPages,
  addPageNumbers,
  addWatermark,
} from './services/page-ops'
import { moveIndex } from './services/order-util'
import { downloadBytes } from './services/export-service'
import { downloadZip } from './services/zip-export'
import { exportPagesAsImages } from './services/image-export'
import { readInfo } from './services/metadata'
import type { PdfInfo } from './services/metadata'
import InfoModal from './components/InfoModal'

export default function App() {
  const { bytes, fileName, load, apply, undo, redo, canUndo, canRedo } = useDocumentStore()
  const objectCount = useOverlayStore((s) => s.objects.length)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selected, setSelected] = useState(1)
  const [zoom, setZoom] = useState(1.5)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([0]))
  const [anchor, setAnchor] = useState(0)
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'jpeg'>('pdf')
  const [busy, setBusy] = useState(false)

  // Measured canvas size for overlay alignment
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const [canvasSizePx, setCanvasSizePx] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const wrap = canvasWrapRef.current
    if (!wrap) return
    const canvas = wrap.querySelector('canvas')
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      setCanvasSizePx({ w: canvas.offsetWidth, h: canvas.offsetHeight })
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [doc, selected])

  const run = async (p: Promise<void>) => {
    setBusy(true)
    try {
      await p
    } catch (e) {
      console.error('operation failed', e)
    } finally {
      setBusy(false)
    }
  }
  const dragFrom = useRef<number | null>(null)

  useEffect(() => {
    if (!bytes) {
      setDoc(null)
      setPageCount(0)
      return
    }
    let active = true
    ;(async () => {
      const [rdoc, count] = await Promise.all([loadRenderDoc(bytes), getPageCount(bytes)])
      if (!active) return
      setDoc(rdoc)
      setPageCount(count)
      setSelected((s) => {
        const clamped = Math.min(s, count) || 1
        // Collapse the multi-selection to the current page after any structural
        // change (open/edit). Selection indices are not remapped across a
        // reorder/delete/duplicate, so keeping the old set would highlight — and
        // target — the wrong pages. Collapsing keeps selection trustworthy.
        setSelectedPages(new Set([clamped - 1]))
        setAnchor(clamped - 1)
        return clamped
      })
    })()
    return () => {
      active = false
    }
  }, [bytes])

  async function onOpen(files: File[]) {
    const all = await Promise.all(files.map(readFileAsBytes))
    const merged = all.length === 1 ? all[0] : await mergePdfs(all)
    load(merged, files.length === 1 ? files[0].name : 'combined.pdf')
    useOverlayStore.getState().clear()
    setSelected(1)
    setSelectedPages(new Set([0]))
    setAnchor(0)
  }

  function handleThumbClick(i: number, e: React.MouseEvent) {
    setSelected(i + 1)
    if (e.shiftKey) {
      const [lo, hi] = [Math.min(anchor, i), Math.max(anchor, i)]
      setSelectedPages(new Set(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)))
    } else if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedPages)
      next.has(i) ? next.delete(i) : next.add(i)
      setSelectedPages(next)
      setAnchor(i)
    } else {
      setSelectedPages(new Set([i]))
      setAnchor(i)
    }
  }

  const sel = () => (selectedPages.size ? [...selectedPages].sort((a, b) => a - b) : [selected - 1])

  const onRotateL = () => run(apply((b) => rotatePages(b, sel(), -90)))
  const onRotateR = () => run(apply((b) => rotatePages(b, sel(), 90)))
  const onDuplicate = () => run(apply((b) => duplicatePages(b, sel())))
  const onDelete = () => run(apply((b) => deletePages(b, sel())))
  const onExtract = () => run(
    (async () => {
      if (!bytes) return
      const out = await extractPages(bytes, sel())
      downloadBytes(out, 'extracted.pdf')
    })(),
  )
  const onSplit = () => run(
    (async () => {
      if (!bytes) return
      const pages = sel()
      const parts = await splitPdf(bytes, pages.map((p) => [p]))
      await downloadZip(parts.map((b, k) => ({ name: `page-${pages[k] + 1}.pdf`, bytes: b })), 'split.pdf.zip')
    })(),
  )
  const onReplace = (file: File) => run(
    (async () => {
      const other = await readFileAsBytes(file)
      await apply((b) => replacePage(b, sel()[0], other, 0))
    })(),
  )
  const onInsert = () => run(apply((b) => {
    // selected is 1-based; passing it as 0-based atIndex inserts AFTER the current page
    return insertBlankPage(b, selected)
  }))
  const onMerge = (file: File) => run(
    (async () => {
      const other = await readFileAsBytes(file)
      await apply((b) => mergePdfs([b, other]))
    })(),
  )
  const onApply = () => run(
    (async () => {
      await apply((b) => flattenObjects(b, useOverlayStore.getState().objects))
      useOverlayStore.getState().clear()
    })(),
  )

  const onDownload = () => run(
    (async () => {
      if (!bytes) return
      if (exportFormat === 'pdf') {
        const objs = useOverlayStore.getState().objects
        const outBytes = objs.length ? await flattenObjects(bytes, objs) : bytes
        downloadBytes(outBytes, fileName ?? 'edited.pdf')
        return
      }
      const freshDoc = await loadRenderDoc(bytes)
      const pages = sel().map((i) => i + 1).filter((p) => p >= 1 && p <= freshDoc.numPages) // 1-based for pdf.js
      if (pages.length === 0) return
      const files = await exportPagesAsImages(freshDoc, pages, exportFormat, 2)
      await downloadZip(files, 'images.zip')
    })(),
  )
  const onInfo = async () => {
    if (bytes) setInfo(await readInfo(bytes))
  }
  const onPageNumbers = () => run(apply((b) => addPageNumbers(b, { format: 'n/total' })))
  const onWatermark = () => { const t = window.prompt('Watermark text', 'DRAFT'); if (t) run(apply((b) => addWatermark(b, t))) }

  const onAddText = () => {
    useOverlayStore.getState().addText(selected - 1)
  }

  const onAddImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result
      if (!(arrayBuffer instanceof ArrayBuffer)) return
      const bytes = new Uint8Array(arrayBuffer)
      const mimeType = file.type === 'image/jpeg' ? 'jpeg' : 'png'
      const img = new Image()
      img.onload = () => {
        const pageW = canvasSizePx.w || 600
        const pageH = canvasSizePx.h || 800
        const wPct = 0.3
        const hPct = wPct * (img.naturalHeight / img.naturalWidth) * (pageW / pageH)
        useOverlayStore.getState().addImage(selected - 1, bytes, mimeType, wPct, hPct)
      }
      img.src = URL.createObjectURL(file)
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="app-shell">
      {info && <InfoModal info={info} onClose={() => setInfo(null)} />}
      <Toolbar
        onOpen={onOpen}
        onRotateL={onRotateL}
        onRotateR={onRotateR}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onExtract={onExtract}
        onSplit={onSplit}
        onReplace={onReplace}
        onInsert={onInsert}
        onMerge={onMerge}
        onUndo={undo}
        onRedo={redo}
        onDownload={onDownload}
        canUndo={canUndo()}
        canRedo={canRedo()}
        hasDoc={!!bytes}
        busy={busy}
        selectionCount={selectedPages.size}
        canReplace={selectedPages.size === 1}
        onInfo={onInfo}
        onPageNumbers={onPageNumbers}
        onWatermark={onWatermark}
        onAddText={onAddText}
        onAddImage={onAddImage}
        onApply={onApply}
        objectCount={objectCount}
        exportFormat={exportFormat}
        onExportFormatChange={setExportFormat}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ThumbnailRail>
          {doc &&
            Array.from({ length: pageCount }, (_, i) => (
              <div
                key={i}
                data-testid="thumb"
                draggable
                className={`thumb-card${selectedPages.has(i) ? ' thumb-card--selected' : ''}`}
                onClick={(e) => handleThumbClick(i, e)}
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom.current !== null && dragFrom.current !== i)
                    run(apply((b) => reorderPages(b, moveIndex(pageCount, dragFrom.current!, i))))
                  dragFrom.current = null
                }}
              >
                <PageCanvas
                  doc={doc}
                  pageNumber={i + 1}
                  scale={0.5}
                  className="max-w-full cursor-pointer"
                />
              </div>
            ))}
        </ThumbnailRail>
        <Viewer>
          {!bytes && (
            <div className="empty-state">
              <svg className="empty-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M28 4v10h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="empty-label">Open a PDF to get started</span>
            </div>
          )}
          {doc && (
            <>
              <PreviewControls
                page={selected}
                pageCount={pageCount}
                zoom={zoom}
                onGo={(p) => setSelected(p)}
                onZoom={(z) => setZoom(z === 'fit' ? 1.5 : z)}
              />
              <div
                ref={canvasWrapRef}
                style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}
              >
                <PageCanvas doc={doc} pageNumber={selected} scale={zoom} className="page-canvas-viewer" />
                {canvasSizePx.w > 0 && canvasSizePx.h > 0 && (
                  <OverlayLayer
                    page={selected - 1}
                    pageWidthPx={canvasSizePx.w}
                    pageHeightPx={canvasSizePx.h}
                  />
                )}
              </div>
            </>
          )}
        </Viewer>
      </div>
    </div>
  )
}

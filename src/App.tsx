import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist' // type-only: needed for state typing
import Toolbar from './components/Toolbar'
import PageGrid from './components/PageGrid'
import Landing from './components/Landing'
import type { CardOpenTool } from './components/PageGrid'
import PageEditModal from './components/PageEditModal'
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
import { shrinkPdf } from './services/shrink-service'

export default function App() {
  const { bytes, fileName, load, apply, undo, redo, canUndo, canRedo } = useDocumentStore()
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selected, setSelected] = useState(1)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([0]))
  const [anchor, setAnchor] = useState(0)
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'jpeg'>('pdf')
  const [busy, setBusy] = useState(false)
  const [previewPage, setPreviewPage] = useState<number | null>(null)
  const [modalZoom, setModalZoom] = useState(1)

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

  // Apply flattens ALL overlay objects across every page into the PDF bytes
  // Non-destructive: "Apply" just closes the modal and KEEPS the objects as an
  // editable layer (re-openable to move/resize/edit/delete). Objects are baked
  // into the PDF only at Download/Export (see onDownload), so they stay editable.
  const onApply = () => setPreviewPage(null)

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
  const onShrink = () => run(apply((b) => shrinkPdf(b)))

  // Modal-scoped Add text: adds to the currently previewed page
  const onModalAddText = () => {
    const targetPage = previewPage !== null ? previewPage : selected - 1
    useOverlayStore.getState().addText(targetPage)
  }

  // Modal-scoped Add picture: opens a file picker, then adds to the previewed page
  const addImageInputRef = useRef<HTMLInputElement>(null)
  // Tracks the target page for the next image-file pick (set synchronously before
  // calling .click() so it is available when the onChange handler fires).
  const addImageTargetPageRef = useRef<number | null>(null)
  const onModalAddPicture = () => {
    addImageTargetPageRef.current = previewPage
    addImageInputRef.current?.click()
  }

  const handleAddImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result
      if (!(arrayBuffer instanceof ArrayBuffer)) return
      const imgBytes = new Uint8Array(arrayBuffer)
      const mimeType = file.type === 'image/jpeg' ? 'jpeg' : 'png'
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        // Use the ref-captured target page (set before the picker opened) so
        // that both the modal button and the grid-card button land on the right page.
        const targetPage = addImageTargetPageRef.current !== null
          ? addImageTargetPageRef.current
          : previewPage !== null ? previewPage : selected - 1
        const pageW = 600
        const pageH = 800
        const wPct = 0.3
        const hPct = wPct * (img.naturalHeight / img.naturalWidth) * (pageW / pageH)
        useOverlayStore.getState().addImage(targetPage, imgBytes, mimeType, wPct, hPct)
        addImageTargetPageRef.current = null
      }
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        addImageTargetPageRef.current = null
      }
      img.src = URL.createObjectURL(file)
    }
    reader.readAsArrayBuffer(file)
  }

  // Handle opening the modal from a page card
  const handleCardOpen = (i: number, tool: CardOpenTool) => {
    setModalZoom(1) // default preview at 100%
    setPreviewPage(i)
    // If the card tool is 'text', immediately add a text object after opening
    if (tool === 'text') {
      useOverlayStore.getState().addText(i)
    }
  }

  // Handle 'picture' hover button on a grid card: set the target page in the
  // ref synchronously (preserving the user-gesture chain), trigger the file
  // picker, and open the modal so the added image is visible.
  const handleCardPicture = (i: number) => {
    setModalZoom(1) // default preview at 100%
    setPreviewPage(i)
    addImageTargetPageRef.current = i
    addImageInputRef.current?.click()
  }

  // Handle modal zoom — support 'fit' as a no-op sentinel (fit-to-width logic
  // would need canvas measurements; for now fit resets to 1.0)
  const handleModalZoom = (z: number | 'fit') => {
    setModalZoom(z === 'fit' ? 1 : z)
  }

  // Handle modal page navigation (1-based)
  const handleModalGo = (p: number) => {
    const clamped = Math.min(Math.max(1, p), pageCount)
    setPreviewPage(clamped - 1)
  }

  return (
    <div className="app-shell">
      {info && <InfoModal info={info} onClose={() => setInfo(null)} />}
      {/* The menu bar only appears once a document is open. The landing state is
          just the drop zone — no toolbar. */}
      {bytes && (
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
          onShrink={onShrink}
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
        />
      )}
      {/* Status line */}
      {bytes && (
        <div className="status-line">
          <span>{fileName ?? 'document'}</span>
          <span className="status-sep">·</span>
          <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
        </div>
      )}
      {/* Main grid area — show Landing when no document is loaded */}
      {!bytes ? (
        <Landing onFiles={onOpen} />
      ) : (
        <main className="grid-area">
          <PageGrid
            doc={doc}
            pageCount={pageCount}
            selectedPages={selectedPages}
            onCardClick={handleThumbClick}
            onCardOpen={handleCardOpen}
            onCardPicture={handleCardPicture}
            onHoverRotate={(i) => run(apply((b) => rotatePages(b, [i], 90)))}
            onHoverDelete={(i) => run(apply((b) => deletePages(b, [i])))}
            dragFrom={dragFrom}
            onDrop={(from, to) => run(apply((b) => reorderPages(b, moveIndex(pageCount, from, to))))}
          />
        </main>
      )}

      {/* Page edit/preview modal */}
      {previewPage !== null && doc && (
        <PageEditModal
          page={previewPage}
          pageCount={pageCount}
          doc={doc}
          zoom={modalZoom}
          onZoom={handleModalZoom}
          onGo={handleModalGo}
          onClose={() => setPreviewPage(null)}
          onAddText={onModalAddText}
          onAddPicture={onModalAddPicture}
          onApply={onApply}
        />
      )}

      {/* Hidden file input for adding images inside the modal */}
      <input
        ref={addImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleAddImageFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

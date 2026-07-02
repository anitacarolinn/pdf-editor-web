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
import { readInfo } from './services/metadata'
import type { PdfInfo } from './services/metadata'
import InfoModal from './components/InfoModal'
import ShrinkModal from './components/ShrinkModal'
import SignatureModal from './components/SignatureModal'
import LockModal from './components/LockModal'
import UnlockModal from './components/UnlockModal'
import WatermarkModal from './components/WatermarkModal'
import type { WatermarkOpts } from './services/page-ops'
import { imagesToPdf } from './services/image-to-pdf'

export default function App() {
  const { bytes, fileName, load, apply, undo, redo, canUndo, canRedo } = useDocumentStore()
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selected, setSelected] = useState(1)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([0]))
  const [anchor, setAnchor] = useState(0)
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [previewPage, setPreviewPage] = useState<number | null>(null)
  const [modalZoom, setModalZoom] = useState(1)
  const [shrinkOpen, setShrinkOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [lastSignatureBytes, setLastSignatureBytes] = useState<Uint8Array | null>(null)
  const [signedThisSession, setSignedThisSession] = useState(false)
  const [showSavePngDialog, setShowSavePngDialog] = useState(false)
  const [watermarkOpen, setWatermarkOpen] = useState(false)
  const [officeToast, setOfficeToast] = useState(false)

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
    const pdfFiles: File[] = []
    const imageFiles: File[] = []
    const officeExts = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.odt', '.ods', '.odp']
    let hasOffice = false

    for (const f of files) {
      const nameLower = f.name.toLowerCase()
      if (f.type === 'application/pdf' || nameLower.endsWith('.pdf')) {
        pdfFiles.push(f)
      } else if (f.type === 'image/png' || nameLower.endsWith('.png')) {
        imageFiles.push(f)
      } else if (f.type === 'image/jpeg' || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) {
        imageFiles.push(f)
      } else if (officeExts.some((ext) => nameLower.endsWith(ext))) {
        hasOffice = true
      }
      // Unknown types silently skipped
    }

    if (hasOffice) {
      setOfficeToast(true)
      setTimeout(() => setOfficeToast(false), 4000)
    }

    if (imageFiles.length === 0 && pdfFiles.length === 0) return

    const pdfBytes = await Promise.all(pdfFiles.map(readFileAsBytes))
    let result: Uint8Array

    if (imageFiles.length > 0) {
      // Convert images to one PDF, then merge with any PDF files
      const imgItems = await Promise.all(
        imageFiles.map(async (f) => ({
          bytes: await readFileAsBytes(f),
          type: (f.type === 'image/jpeg' || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg'))
            ? 'jpeg' as const
            : 'png' as const,
        })),
      )
      const imgPdf = await imagesToPdf(imgItems)
      const allPdfs = pdfBytes.length > 0 ? [...pdfBytes, imgPdf] : [imgPdf]
      result = allPdfs.length === 1 ? allPdfs[0] : await mergePdfs(allPdfs)
    } else {
      // PDF-only (original behavior)
      result = pdfBytes.length === 1 ? pdfBytes[0] : await mergePdfs(pdfBytes)
    }

    const firstName = pdfFiles[0]?.name ?? imageFiles[0]?.name ?? 'converted.pdf'
    const finalName = (pdfFiles.length + imageFiles.length) === 1 ? firstName : 'combined.pdf'
    load(result, finalName)
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
  const onMerge = (files: File[]) => run(
    (async () => {
      const others = await Promise.all(files.map(readFileAsBytes))
      await apply((b) => mergePdfs([b, ...others]))
    })(),
  )

  // Apply flattens ALL overlay objects across every page into the PDF bytes
  // Non-destructive: "Apply" just closes the modal and KEEPS the objects as an
  // editable layer (re-openable to move/resize/edit/delete). Objects are baked
  // into the PDF only at Download/Export (see onDownload), so they stay editable.
  const onApply = () => {
    if (signedThisSession) {
      setShowSavePngDialog(true)
    } else {
      setPreviewPage(null)
      setSignedThisSession(false)
    }
  }

  const onDownload = () => run(
    (async () => {
      if (!bytes) return
      // Export is always PDF: bake any overlay objects (text/image/signature)
      // into the bytes, then download.
      const objs = useOverlayStore.getState().objects
      const outBytes = objs.length ? await flattenObjects(bytes, objs) : bytes
      downloadBytes(outBytes, fileName ?? 'edited.pdf')
    })(),
  )
  const onInfo = async () => {
    if (bytes) setInfo(await readInfo(bytes))
  }
  const onPageNumbers = () => run(apply((b) => addPageNumbers(b, { format: 'n/total' })))
  const onWatermark = () => setWatermarkOpen(true)
  const onShrink = () => setShrinkOpen(true)
  const onLock = () => setLockOpen(true)
  const onUnlock = () => setUnlockOpen(true)

  // Handle a completed signature drawing: convert transparent-PNG bytes to an
  // overlay image at ~30% page width, preserving aspect ratio.
  const handleSignatureAdd = (sigBytes: Uint8Array) => {
    const targetPage = previewPage !== null ? previewPage : selected - 1
    // Decode the PNG to measure its natural dimensions for accurate aspect ratio
    const blob = new Blob([new Uint8Array(sigBytes)], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const pageW = 600
      const pageH = 800
      const wPct = 0.3
      const hPct = wPct * (img.naturalHeight / img.naturalWidth) * (pageW / pageH)
      useOverlayStore.getState().addImage(targetPage, sigBytes, 'png', wPct, hPct)
      setLastSignatureBytes(sigBytes)
      setSignedThisSession(true)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
    setSignOpen(false)
  }

  // Modal-scoped page operations — operate on the currently previewed page
  const onModalDeletePage = () => {
    if (previewPage === null) return
    run(apply((b) => deletePages(b, [previewPage])))
  }
  const onModalDuplicate = () => {
    if (previewPage === null) return
    run(apply((b) => duplicatePages(b, [previewPage])))
  }
  const onModalRotateL = () => {
    if (previewPage === null) return
    run(apply((b) => rotatePages(b, [previewPage], -90)))
  }
  const onModalRotateR = () => {
    if (previewPage === null) return
    run(apply((b) => rotatePages(b, [previewPage], 90)))
  }
  // Move the previewed page one position earlier; follow the page after reorder
  const onModalMoveBefore = () => {
    if (previewPage === null || previewPage <= 0) return
    const newOrder = moveIndex(pageCount, previewPage, previewPage - 1)
    run(apply((b) => reorderPages(b, newOrder)))
    setPreviewPage(previewPage - 1)
  }
  // Move the previewed page one position later; follow the page after reorder
  const onModalMoveAfter = () => {
    if (previewPage === null || previewPage >= pageCount - 1) return
    const newOrder = moveIndex(pageCount, previewPage, previewPage + 1)
    run(apply((b) => reorderPages(b, newOrder)))
    setPreviewPage(previewPage + 1)
  }

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

  const onModalSign = () => setSignOpen(true)

  const handleModalClose = () => {
    setPreviewPage(null)
    setSignedThisSession(false)
    setLastSignatureBytes(null)
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
      {officeToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3000,
            background: '#1c1917',
            color: '#fef3c7',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
          }}
        >
          Word/Excel/PowerPoint conversion isn&apos;t available in the browser version yet.
        </div>
      )}
      {info && <InfoModal info={info} onClose={() => setInfo(null)} />}
      {shrinkOpen && bytes && (
        <ShrinkModal
          bytes={bytes}
          onApply={(resultBytes) => {
            run(apply(() => Promise.resolve(resultBytes)))
            setShrinkOpen(false)
          }}
          onClose={() => setShrinkOpen(false)}
        />
      )}
      {lockOpen && bytes && (
        <LockModal
          bytes={bytes}
          onLocked={(locked) => {
            // Download the encrypted copy — do NOT replace the working document,
            // since an encrypted PDF can't be re-rendered by the pdf.js viewer.
            downloadBytes(locked, 'locked.pdf')
            setLockOpen(false)
          }}
          onClose={() => setLockOpen(false)}
        />
      )}
      {unlockOpen && (
        <UnlockModal
          onUnlocked={(decrypted, name) => {
            // Load decrypted bytes as the working document (same path as onOpen).
            load(decrypted, name)
            useOverlayStore.getState().clear()
            setSelected(1)
            setSelectedPages(new Set([0]))
            setAnchor(0)
            setUnlockOpen(false)
          }}
          onClose={() => setUnlockOpen(false)}
        />
      )}
      {signOpen && (
        <SignatureModal
          onAdd={handleSignatureAdd}
          onClose={() => setSignOpen(false)}
        />
      )}
      {watermarkOpen && bytes && (
        <WatermarkModal
          onApply={(opts: WatermarkOpts) => {
            run(apply((b) => addWatermark(b, opts)))
            setWatermarkOpen(false)
          }}
          onClose={() => setWatermarkOpen(false)}
        />
      )}
      {showSavePngDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              padding: '28px 32px',
              minWidth: 360,
              maxWidth: 420,
            }}
          >
            <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#111827' }}>
              Save signature?
            </h2>
            <p style={{ margin: '0 0 22px', fontSize: 13.5, color: '#6b7280', lineHeight: 1.5 }}>
              Save this signature as a PNG file for reuse?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSavePngDialog(false)
                  setSignedThisSession(false)
                  setPreviewPage(null)
                }}
                style={{
                  padding: '8px 18px',
                  background: '#f4f4f5',
                  border: '1px solid rgba(24,24,27,0.09)',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#3f3f46',
                  cursor: 'pointer',
                }}
              >
                No thanks
              </button>
              <button
                onClick={() => {
                  if (lastSignatureBytes) downloadBytes(lastSignatureBytes, 'signature.png')
                  setShowSavePngDialog(false)
                  setSignedThisSession(false)
                  setLastSignatureBytes(null)
                  setPreviewPage(null)
                }}
                style={{
                  padding: '8px 22px',
                  background: '#d97706',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Save PNG
              </button>
            </div>
          </div>
        </div>
      )}
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
          onLock={onLock}
          onUnlock={onUnlock}
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
          onClose={handleModalClose}
          onAddText={onModalAddText}
          onAddPicture={onModalAddPicture}
          onSign={onModalSign}
          onApply={onApply}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo()}
          canRedo={canRedo()}
          onInsert={onInsert}
          onDeletePage={onModalDeletePage}
          onDuplicate={onModalDuplicate}
          onRotateL={onModalRotateL}
          onRotateR={onModalRotateR}
          onMoveBefore={onModalMoveBefore}
          onMoveAfter={onModalMoveAfter}
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

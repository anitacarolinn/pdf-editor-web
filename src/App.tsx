import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Toolbar from './components/Toolbar'
import ThumbnailRail from './components/ThumbnailRail'
import Viewer from './components/Viewer'
import PageCanvas from './components/PageCanvas'
import PreviewControls from './components/PreviewControls'
import { useDocumentStore } from './services/document-store'
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
} from './services/page-ops'
import { moveIndex } from './services/order-util'
import { downloadBytes } from './services/export-service'
import { downloadZip } from './services/zip-export'
import { readInfo } from './services/metadata'
import type { PdfInfo } from './services/metadata'
import InfoModal from './components/InfoModal'

const runOp = (p: Promise<void>) => p.catch((e) => console.error('operation failed', e))

export default function App() {
  const { bytes, fileName, load, apply, undo, redo, canUndo, canRedo } = useDocumentStore()
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selected, setSelected] = useState(1)
  const [zoom, setZoom] = useState(1.5)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([0]))
  const [anchor, setAnchor] = useState(0)
  const [info, setInfo] = useState<PdfInfo | null>(null)
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

  const onRotateL = () => runOp(apply((b) => rotatePages(b, sel(), -90)))
  const onRotateR = () => runOp(apply((b) => rotatePages(b, sel(), 90)))
  const onDuplicate = () => runOp(apply((b) => duplicatePages(b, sel())))
  const onDelete = () => runOp(apply((b) => deletePages(b, sel())))
  const onExtract = async () => {
    if (!bytes) return
    const out = await extractPages(bytes, sel())
    downloadBytes(out, 'extracted.pdf')
  }
  const onSplit = async () => {
    if (!bytes) return
    const pages = sel()
    const parts = await splitPdf(bytes, pages.map((p) => [p]))
    await downloadZip(parts.map((b, k) => ({ name: `page-${pages[k] + 1}.pdf`, bytes: b })), 'split.pdf.zip')
  }
  const onReplace = (file: File) => runOp(
    (async () => {
      const other = await readFileAsBytes(file)
      await apply((b) => replacePage(b, sel()[0], other, 0))
    })(),
  )
  const onInsert = () => runOp(apply((b) => {
    // selected is 1-based; passing it as 0-based atIndex inserts AFTER the current page
    return insertBlankPage(b, selected)
  }))
  const onMerge = async (file: File) => {
    const other = await readFileAsBytes(file)
    await runOp(apply((b) => mergePdfs([b, other])))
  }
  const onDownload = () => {
    if (bytes) downloadBytes(bytes, fileName ?? 'edited.pdf')
  }
  const onInfo = async () => {
    if (bytes) setInfo(await readInfo(bytes))
  }

  return (
    <div className="flex h-screen flex-col">
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
        selectionCount={selectedPages.size}
        canReplace={selectedPages.size === 1}
        onInfo={onInfo}
      />
      <div className="flex flex-1 overflow-hidden">
        <ThumbnailRail>
          {doc &&
            Array.from({ length: pageCount }, (_, i) => (
              <div
                key={i}
                data-testid="thumb"
                draggable
                onClick={(e) => handleThumbClick(i, e)}
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom.current !== null && dragFrom.current !== i)
                    runOp(apply((b) => reorderPages(b, moveIndex(pageCount, dragFrom.current!, i))))
                  dragFrom.current = null
                }}
              >
                <PageCanvas
                  doc={doc}
                  pageNumber={i + 1}
                  scale={0.5}
                  className={`mb-2 max-w-full cursor-pointer border-2 ${
                    selectedPages.has(i) ? 'border-blue-500' : 'border-transparent'
                  }`}
                />
              </div>
            ))}
        </ThumbnailRail>
        <Viewer>
          {!bytes && (
            <div className="grid h-full place-items-center text-slate-500">
              Open a PDF to get started
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
              <PageCanvas doc={doc} pageNumber={selected} scale={zoom} className="mx-auto max-w-full bg-white shadow" />
            </>
          )}
        </Viewer>
      </div>
    </div>
  )
}

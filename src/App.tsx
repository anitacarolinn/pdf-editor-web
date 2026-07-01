import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Toolbar from './components/Toolbar'
import ThumbnailRail from './components/ThumbnailRail'
import Viewer from './components/Viewer'
import PageCanvas from './components/PageCanvas'
import { useDocumentStore } from './services/document-store'
import { readFileAsBytes } from './services/file-io'
import { loadRenderDoc } from './services/render-service'
import { getPageCount, rotatePage, deletePages, insertBlankPage, mergePdfs } from './services/page-ops'
import { downloadBytes } from './services/export-service'

const runOp = (p: Promise<void>) => p.catch((e) => console.error('operation failed', e))

export default function App() {
  const { bytes, fileName, load, apply, undo, redo, canUndo, canRedo } = useDocumentStore()
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [selected, setSelected] = useState(1)

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
      setSelected((s) => Math.min(s, count) || 1)
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
  }

  const onRotate = () => runOp(apply((b) => rotatePage(b, selected - 1, 90)))
  const onDelete = () => runOp(apply((b) => deletePages(b, [selected - 1])))
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

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        onOpen={onOpen}
        onRotate={onRotate}
        onDelete={onDelete}
        onInsert={onInsert}
        onMerge={onMerge}
        onUndo={undo}
        onRedo={redo}
        onDownload={onDownload}
        canUndo={canUndo()}
        canRedo={canRedo()}
        hasDoc={!!bytes}
      />
      <div className="flex flex-1 overflow-hidden">
        <ThumbnailRail>
          {doc &&
            Array.from({ length: pageCount }, (_, i) => (
              <PageCanvas
                key={i}
                doc={doc}
                pageNumber={i + 1}
                scale={0.5}
                className={`mb-2 max-w-full cursor-pointer border-2 ${
                  selected === i + 1 ? 'border-blue-500' : 'border-transparent'
                }`}
                onClick={() => setSelected(i + 1)}
              />
            ))}
        </ThumbnailRail>
        <Viewer>
          {!bytes && (
            <div className="grid h-full place-items-center text-slate-500">
              Open a PDF to get started
            </div>
          )}
          {doc && (
            <PageCanvas doc={doc} pageNumber={selected} scale={1.5} className="mx-auto max-w-full bg-white shadow" />
          )}
        </Viewer>
      </div>
    </div>
  )
}

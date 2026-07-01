import { useRef } from 'react'

export interface ToolbarProps {
  onOpen: (files: File[]) => void
  onRotateL: () => void
  onRotateR: () => void
  onDuplicate: () => void
  onDelete: () => void
  onExtract: () => void
  onSplit: () => void
  onReplace: (file: File) => void
  onInsert: () => void
  onMerge: (file: File) => void
  onUndo: () => void
  onRedo: () => void
  onDownload: () => void
  onInfo: () => void
  canUndo: boolean
  canRedo: boolean
  hasDoc: boolean
  selectionCount: number
  canReplace: boolean
}

export default function Toolbar(p: ToolbarProps) {
  const openRef = useRef<HTMLInputElement>(null)
  const mergeRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const btn = 'rounded px-3 py-1 text-sm disabled:opacity-40'
  return (
    <header className="flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-800">PDF Editor</span>
      <button className={`${btn} bg-blue-600 text-white`} onClick={() => openRef.current?.click()}>
        Open PDF
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onRotateL}>
        Rotate L
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onRotateR}>
        Rotate R
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onDuplicate}>
        Duplicate
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onDelete}>
        Delete Page
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onExtract}>
        Extract
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onSplit}>
        Split
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || !p.canReplace} onClick={() => replaceRef.current?.click()}>
        Replace
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onInsert}>
        Insert Blank
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={() => mergeRef.current?.click()}>
        Merge PDF
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.canUndo} onClick={p.onUndo}>
        Undo
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.canRedo} onClick={p.onRedo}>
        Redo
      </button>
      <button className={`${btn} bg-green-600 text-white`} disabled={!p.hasDoc} onClick={p.onDownload}>
        Download
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc} onClick={p.onInfo}>
        Info
      </button>
      {p.hasDoc && (
        <span data-testid="selection-count" className="ml-2 text-xs text-slate-500">
          selected: {p.selectionCount}
        </span>
      )}
      <input ref={openRef} type="file" accept="application/pdf" multiple className="hidden"
        onChange={(e) => { const fs = e.target.files; if (fs && fs.length) p.onOpen(Array.from(fs)); e.target.value = '' }} />
      <input ref={mergeRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onMerge(f); e.target.value = '' }} />
      <input ref={replaceRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onReplace(f); e.target.value = '' }} />
    </header>
  )
}

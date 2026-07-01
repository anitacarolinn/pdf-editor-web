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
  onPageNumbers: () => void
  onWatermark: () => void
  canUndo: boolean
  canRedo: boolean
  hasDoc: boolean
  busy: boolean
  selectionCount: number
  canReplace: boolean
  exportFormat: 'pdf' | 'png' | 'jpeg'
  onExportFormatChange: (format: 'pdf' | 'png' | 'jpeg') => void
}

export default function Toolbar(p: ToolbarProps) {
  const openRef = useRef<HTMLInputElement>(null)
  const mergeRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const btn = 'rounded px-3 py-1 text-sm disabled:opacity-40'
  return (
    <header aria-busy={p.busy} className="flex items-center gap-2 border-b bg-white px-4 py-2 shadow-sm">
      <span className="font-semibold text-slate-800">PDF Editor</span>
      <button className={`${btn} bg-blue-600 text-white`} onClick={() => openRef.current?.click()}>
        Open PDF
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onRotateL}>
        Rotate L
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onRotateR}>
        Rotate R
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onDuplicate}>
        Duplicate
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onDelete}>
        Delete Page
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onExtract}>
        Extract
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onSplit}>
        Split
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || !p.canReplace || p.busy} onClick={() => replaceRef.current?.click()}>
        Replace
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onInsert}>
        Insert Blank
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={() => mergeRef.current?.click()}>
        Merge PDF
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.canUndo || p.busy} onClick={p.onUndo}>
        Undo
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.canRedo || p.busy} onClick={p.onRedo}>
        Redo
      </button>
      <select
        data-testid="export-format"
        value={p.exportFormat}
        onChange={(e) => p.onExportFormatChange(e.target.value as 'pdf' | 'png' | 'jpeg')}
        className="rounded border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="pdf">PDF</option>
        <option value="png">PNG</option>
        <option value="jpeg">JPG</option>
      </select>
      <button className={`${btn} bg-green-600 text-white`} disabled={!p.hasDoc || p.busy} onClick={p.onDownload}>
        Download
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onInfo}>
        Info
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onPageNumbers}>
        Page #
      </button>
      <button className={`${btn} bg-slate-100`} disabled={!p.hasDoc || p.busy} onClick={p.onWatermark}>
        Watermark
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

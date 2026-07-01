import { useRef } from 'react'
import {
  IconOpen,
  IconInsertBlank,
  IconMerge,
  IconDelete,
  IconDuplicate,
  IconRotateLeft,
  IconRotateRight,
  IconExtract,
  IconReplace,
  IconSplit,
  IconPageNumber,
  IconWatermark,
  IconShrink,
  IconInfo,
  IconUndo,
  IconRedo,
  IconDownload,
} from './icons'

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
  onMerge: (files: File[]) => void
  onUndo: () => void
  onRedo: () => void
  onDownload: () => void
  onInfo: () => void
  onPageNumbers: () => void
  onWatermark: () => void
  onShrink: () => void
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

  return (
    <header aria-busy={p.busy} className="toolbar-chrome">
      {/* Brand */}
      <div className="toolbar-brand-group">
        <img className="toolbar-logo" src="/favicon.svg" alt="PDF Page Editor logo" />
        <span className="toolbar-brand">PDF Page Editor</span>
        <span className="toolbar-offline-badge">offline</span>
      </div>

      {/* Actions — flat chips grouped by whitespace, like the reference */}
      <div className="toolbar-actions">
        {/* New / Open */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onInsert} title="Insert a blank page after the selected page">
            <IconInsertBlank /><span>New Page</span>
          </button>
          <button className="tbtn" onClick={() => openRef.current?.click()} title="Open a PDF">
            <IconOpen /><span>Open PDF</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Add / Merge */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={() => mergeRef.current?.click()} title="Add / merge another PDF into this document">
            <IconMerge /><span>Add / Merge</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Delete / Duplicate */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onDelete} title="Delete selected pages">
            <IconDelete /><span>Delete page</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onDuplicate} title="Duplicate selected pages">
            <IconDuplicate /><span>Duplicate</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Rotate */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onRotateL} title="Rotate pages left 90°">
            <IconRotateLeft /><span>Rotate L</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onRotateR} title="Rotate pages right 90°">
            <IconRotateRight /><span>Rotate R</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Extract / Replace / Split */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onExtract} title="Extract selected pages to a new PDF">
            <IconExtract /><span>Extract page</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || !p.canReplace || p.busy} onClick={() => replaceRef.current?.click()} title="Replace the selected page with another PDF">
            <IconReplace /><span>Replace page</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onSplit} title="Split selected pages into separate PDFs">
            <IconSplit /><span>Split</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Page # / Watermark / Shrink / Info */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onPageNumbers} title="Add page numbers">
            <IconPageNumber /><span>Page #</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onWatermark} title="Add a watermark">
            <IconWatermark /><span>Watermark</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onShrink} title="Shrink file size by re-encoding pages as JPEG images">
            <IconShrink /><span>Shrink file size</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc} onClick={p.onInfo} title="View document metadata">
            <IconInfo /><span>Info</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* History */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.canUndo || p.busy} onClick={p.onUndo} title="Undo last action">
            <IconUndo /><span>Undo</span>
          </button>
          <button className="tbtn" disabled={!p.canRedo || p.busy} onClick={p.onRedo} title="Redo last undone action">
            <IconRedo /><span>Redo</span>
          </button>
        </div>
      </div>

      {/* Right-side controls */}
      <div className="toolbar-right">
        {p.hasDoc && (
          <span data-testid="selection-count" className="tb-selected">
            selected: {p.selectionCount}
          </span>
        )}

        <select
          data-testid="export-format"
          value={p.exportFormat}
          onChange={(e) => p.onExportFormatChange(e.target.value as 'pdf' | 'png' | 'jpeg')}
          className="export-select"
          aria-label="Export format"
        >
          <option value="pdf">PDF</option>
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
        </select>

        <button className="tbtn-export" disabled={!p.hasDoc || p.busy} onClick={p.onDownload}>
          <IconDownload /><span>Export</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={openRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = e.target.files
          if (fs && fs.length) p.onOpen(Array.from(fs))
          e.target.value = ''
        }}
      />
      <input
        ref={mergeRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = e.target.files
          if (fs && fs.length) p.onMerge(Array.from(fs))
          e.target.value = ''
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) p.onReplace(f)
          e.target.value = ''
        }}
      />
    </header>
  )
}

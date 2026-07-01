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
  onMerge: (file: File) => void
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
      {/* Brand header */}
      <div className="toolbar-brand-group">
        <img className="toolbar-logo" src="/favicon.svg" alt="PDF Page Editor logo" />
        <span className="toolbar-brand">PDF Page Editor</span>
        <span className="toolbar-offline-badge">offline</span>
      </div>

      <div className="toolbar-divider" />

      {/* Group 1: Open / Insert / Merge */}
      <div className="btn-group toolbar-group">
        <button
          className="btn-primary"
          onClick={() => openRef.current?.click()}
        >
          <IconOpen /><span>Open PDF</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onInsert}
          title="Insert a blank page after the selected page"
        >
          <IconInsertBlank /><span>Insert Blank</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={() => mergeRef.current?.click()}
          title="Merge another PDF into this document"
        >
          <IconMerge /><span>Merge PDF</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Group 2: Page manipulation */}
      <div className="btn-group toolbar-group">
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onDelete}
          title="Delete selected pages"
        >
          <IconDelete /><span>Delete Page</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onDuplicate}
          title="Duplicate selected pages"
        >
          <IconDuplicate /><span>Duplicate</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onRotateL}
          title="Rotate pages left 90°"
        >
          <IconRotateLeft /><span>Rotate L</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onRotateR}
          title="Rotate pages right 90°"
        >
          <IconRotateRight /><span>Rotate R</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onExtract}
          title="Extract selected pages to new PDF"
        >
          <IconExtract /><span>Extract</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || !p.canReplace || p.busy}
          onClick={() => replaceRef.current?.click()}
          title="Replace the selected page with another PDF"
        >
          <IconReplace /><span>Replace</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onSplit}
          title="Split selected pages into separate PDFs"
        >
          <IconSplit /><span>Split</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Group 3: Annotations / metadata */}
      <div className="btn-group toolbar-group">
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onPageNumbers}
          title="Add page numbers"
        >
          <IconPageNumber /><span>Page #</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onWatermark}
          title="Add a watermark"
        >
          <IconWatermark /><span>Watermark</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc || p.busy}
          onClick={p.onShrink}
          title="Shrink file size by re-encoding pages as JPEG images"
        >
          <IconShrink /><span>Shrink file size</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.hasDoc}
          onClick={p.onInfo}
          title="View document metadata"
        >
          <IconInfo /><span>Info</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* History */}
      <div className="btn-group toolbar-group">
        <button
          className="btn-tool"
          disabled={!p.canUndo || p.busy}
          onClick={p.onUndo}
          title="Undo last action"
        >
          <IconUndo /><span>Undo</span>
        </button>
        <button
          className="btn-tool"
          disabled={!p.canRedo || p.busy}
          onClick={p.onRedo}
          title="Redo last undone action"
        >
          <IconRedo /><span>Redo</span>
        </button>
      </div>

      {/* Push the right-side controls to the far right */}
      <span className="toolbar-spacer" />

      {/* Selection badge */}
      {p.hasDoc && (
        <span data-testid="selection-count" className="selection-badge">
          {p.selectionCount} selected
        </span>
      )}

      {/* Export format + Download */}
      <select
        data-testid="export-format"
        value={p.exportFormat}
        onChange={(e) => p.onExportFormatChange(e.target.value as 'pdf' | 'png' | 'jpeg')}
        className="export-select"
      >
        <option value="pdf">PDF</option>
        <option value="png">PNG</option>
        <option value="jpeg">JPG</option>
      </select>

      <button
        className="btn-download"
        disabled={!p.hasDoc || p.busy}
        onClick={p.onDownload}
      >
        <IconDownload /><span>Download</span>
      </button>

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
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) p.onMerge(f)
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

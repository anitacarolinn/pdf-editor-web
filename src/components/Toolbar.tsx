import { useRef } from 'react'
import {
  IconOpen,
  IconInsertBlank,
  IconMerge,
  IconDelete,
  IconDuplicate,
  IconExtract,
  IconReplace,
  IconSplit,
  IconPageNumber,
  IconWatermark,
  IconShrink,
  IconInfo,
  IconLock,
  IconUnlock,
  IconUndo,
  IconRedo,
  IconDownload,
} from './icons'
import { useI18n } from '../services/i18n'

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
  onLock: () => void
  onUnlock: () => void
  onHome: () => void
  canUndo: boolean
  canRedo: boolean
  hasDoc: boolean
  busy: boolean
  selectionCount: number
  canReplace: boolean
}

export default function Toolbar(p: ToolbarProps) {
  const openRef = useRef<HTMLInputElement>(null)
  const mergeRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  return (
    <header aria-busy={p.busy} className="toolbar-chrome">
      {/* Brand — click to return to the landing */}
      <button type="button" className="toolbar-brand-group" onClick={p.onHome} title="Back to start" aria-label="Back to start">
        <img className="toolbar-logo" src="/favicon.svg" alt="PDF Editor logo" />
        <span className="toolbar-brand">PDF Editor</span>
      </button>

      {/* Actions — flat chips grouped by whitespace, like the reference */}
      <div className="toolbar-actions">
        {/* New / Open */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onInsert} title={t.tbNewPageTitle}>
            <IconInsertBlank /><span>{t.tbNewPage}</span>
          </button>
          <button className="tbtn" onClick={() => openRef.current?.click()} title={t.tbOpenPdfTitle}>
            <IconOpen /><span>{t.tbOpenPdf}</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Add / Merge */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={() => mergeRef.current?.click()} title={t.tbAddMergeTitle}>
            <IconMerge /><span>{t.tbAddMerge}</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Delete / Duplicate */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onDelete} title={t.tbDeletePageTitle}>
            <IconDelete /><span>{t.tbDeletePage}</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onDuplicate} title={t.tbDuplicateTitle}>
            <IconDuplicate /><span>{t.tbDuplicate}</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Extract / Replace / Split */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onExtract} title={t.tbExtractPageTitle}>
            <IconExtract /><span>{t.tbExtractPage}</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || !p.canReplace || p.busy} onClick={() => replaceRef.current?.click()} title={t.tbReplacePageTitle}>
            <IconReplace /><span>{t.tbReplacePage}</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onSplit} title={t.tbSplitTitle}>
            <IconSplit /><span>{t.tbSplit}</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Page # / Watermark / Shrink / Info */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onPageNumbers} title={t.tbPageNumTitle}>
            <IconPageNumber /><span>{t.tbPageNum}</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onWatermark} title={t.tbWatermarkTitle}>
            <IconWatermark /><span>{t.tbWatermark}</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onShrink} title={t.tbShrinkTitle}>
            <IconShrink /><span>{t.tbShrink}</span>
          </button>
          <button className="tbtn" disabled={!p.hasDoc} onClick={p.onInfo} title={t.tbInfoTitle}>
            <IconInfo /><span>{t.tbInfo}</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* Security — Lock / Unlock */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.hasDoc || p.busy} onClick={p.onLock} title={t.tbLockTitle}>
            <IconLock /><span>{t.tbLock}</span>
          </button>
          <button className="tbtn" disabled={p.busy} onClick={p.onUnlock} title={t.tbUnlockTitle}>
            <IconUnlock /><span>{t.tbUnlock}</span>
          </button>
        </div>

        <span className="tb-sep" aria-hidden />

        {/* History */}
        <div className="tb-group">
          <button className="tbtn" disabled={!p.canUndo || p.busy} onClick={p.onUndo} title={t.tbUndoTitle}>
            <IconUndo /><span>{t.tbUndo}</span>
          </button>
          <button className="tbtn" disabled={!p.canRedo || p.busy} onClick={p.onRedo} title={t.tbRedoTitle}>
            <IconRedo /><span>{t.tbRedo}</span>
          </button>
        </div>
      </div>

      {/* Right-side controls */}
      <div className="toolbar-right">
        {p.hasDoc && (
          <span data-testid="selection-count" className="tb-selected">
            {t.tbSelected(p.selectionCount)}
          </span>
        )}

        <button className="tbtn-export" disabled={!p.hasDoc || p.busy} onClick={p.onDownload}>
          <IconDownload /><span>{t.tbExport}</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={openRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
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

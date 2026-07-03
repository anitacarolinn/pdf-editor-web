import type React from 'react'
import { useI18n } from '../services/i18n'
import type { MarkupType } from '../services/markup-store'

export interface SelectionPopupProps {
  pos: { x: number; y: number } | null
  selectedText: string
  onCopy: () => void
  onMark: (type: MarkupType, color: string) => void
  onSearch: () => void
  onDismiss: () => void
}

const SWATCHES = ['#ffd54a', '#a5f3a0', '#f7a8c4', '#a8c9f7']

const btn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#f9fafb',
  fontSize: 13, padding: '4px 8px', cursor: 'pointer', borderRadius: 4, whiteSpace: 'nowrap',
}

export default function SelectionPopup({
  pos, selectedText, onCopy, onMark, onSearch,
}: SelectionPopupProps) {
  const { t } = useI18n()
  if (!pos || !selectedText) return null

  return (
    <div
      data-testid="selection-popup"
      onMouseDown={(e) => e.preventDefault()} // keep the selection alive on click
      style={{
        position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)',
        display: 'flex', alignItems: 'center', gap: 2, zIndex: 1100,
        background: '#1f2937', borderRadius: 8, padding: '4px 6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}
    >
      <button aria-label={t.tlCopy} style={btn} onClick={onCopy}>{t.tlCopy}</button>
      <button aria-label={t.tlHighlight} style={btn} onClick={() => onMark('highlight', SWATCHES[0])}>
        {t.tlHighlight}
      </button>
      <span style={{ display: 'flex', gap: 3, padding: '0 2px' }}>
        {SWATCHES.map((c) => (
          <button
            key={c}
            aria-label={`${t.tlHighlight} ${c}`}
            onClick={() => onMark('highlight', c)}
            style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #ffffff55',
              background: c, cursor: 'pointer', padding: 0 }}
          />
        ))}
      </span>
      <button aria-label={t.tlUnderline} style={btn} onClick={() => onMark('underline', '#000000')}>
        {t.tlUnderline}
      </button>
      <button aria-label={t.tlStrikethrough} style={btn} onClick={() => onMark('strikethrough', '#000000')}>
        {t.tlStrikethrough}
      </button>
      <button aria-label={t.tlSearchThis} style={btn} onClick={onSearch}>🔍</button>
    </div>
  )
}

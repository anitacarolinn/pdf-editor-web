import type React from 'react'
import { useI18n } from '../services/i18n'

export interface SearchBarProps {
  query: string
  totalMatches: number
  currentIndex: number
  onQueryChange: (q: string) => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#374151', fontSize: 14, padding: '4px 8px', borderRadius: 4,
}

export default function SearchBar({
  query, totalMatches, currentIndex, onQueryChange, onPrev, onNext, onClose,
}: SearchBarProps) {
  const { t } = useI18n()
  const noMatches = query.length > 0 && totalMatches === 0
  return (
    <div
      data-testid="search-bar"
      style={{
        position: 'absolute', top: 12, right: 16, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
        padding: '4px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      <input
        aria-label={t.tlSearchPlaceholder}
        placeholder={t.tlSearchPlaceholder}
        value={query}
        autoFocus
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNext()
          else if (e.key === 'Escape') onClose()
        }}
        style={{ border: 'none', outline: 'none', fontSize: 13, width: 180, color: '#111827' }}
      />
      <span style={{ fontSize: 12, color: noMatches ? '#b91c1c' : '#6b7280', minWidth: 48, textAlign: 'center' }}>
        {noMatches ? t.tlNoMatches : totalMatches > 0 ? t.tlMatchOf(currentIndex + 1, totalMatches) : ''}
      </span>
      <button aria-label={t.tlPrevMatch} style={iconBtn} disabled={totalMatches === 0} onClick={onPrev}>▲</button>
      <button aria-label={t.tlNextMatch} style={iconBtn} disabled={totalMatches === 0} onClick={onNext}>▼</button>
      <button aria-label={t.tlCloseSearch} style={iconBtn} onClick={onClose}>✕</button>
    </div>
  )
}

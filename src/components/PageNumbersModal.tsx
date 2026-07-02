import React, { useState } from 'react'
import type { PageNumberFormat, PageNumberOpts, PageNumberPosition } from '../services/page-ops'
import { pageNumberLabel } from '../services/page-ops'
import { useI18n } from '../services/i18n'

interface PageNumbersModalProps {
  pageCount: number
  onApply: (opts: PageNumberOpts) => void
  onClose: () => void
}

const accent = '#d97706'
const chrome = '#18181b'
const chromeMuted = '#71717a'
const chromeSecondary = '#3f3f46'
const surfaceBase = '#f4f4f5'
const hairline = 'rgba(24,24,27,0.09)'

const FORMATS: PageNumberFormat[] = ['n/total', 'n', 'zh', 'dash']

export default function PageNumbersModal({ pageCount, onApply, onClose }: PageNumbersModalProps) {
  const { t } = useI18n()
  const [format, setFormat] = useState<PageNumberFormat>('n/total')
  const [position, setPosition] = useState<PageNumberPosition>('center')
  const [skipFirst, setSkipFirst] = useState(false)
  const [startAt, setStartAt] = useState(1)

  // Preview uses the real document length so "1 / 12" reflects the actual total.
  const numbered = Math.max(1, pageCount - (skipFirst && pageCount > 1 ? 1 : 0))

  const secondaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 18px', background: surfaceBase, border: `1px solid ${hairline}`,
    borderRadius: 10, fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
    color: chromeSecondary, cursor: 'pointer',
  }
  const primaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 22px', background: accent, border: 'none',
    borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    color: '#fff', cursor: 'pointer',
  }

  const positions: { key: PageNumberPosition; label: string }[] = [
    { key: 'left', label: t.pnPosLeft },
    { key: 'center', label: t.pnPosCenter },
    { key: 'right', label: t.pnPosRight },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 400 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 420 }}>
          <h2 className="modal-title">{t.pnTitle}</h2>

          {/* Format — 2×2 grid of selectable previews */}
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 8 }}>
            {t.pnFormat}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {FORMATS.map((f) => {
              const selected = format === f
              return (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  aria-pressed={selected}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 46, borderRadius: 10, cursor: 'pointer',
                    fontFamily: '"Geist Mono Variable", ui-monospace, monospace',
                    fontSize: 14, fontWeight: 500,
                    color: selected ? chrome : chromeMuted,
                    background: selected ? '#fff' : surfaceBase,
                    border: `1.5px solid ${selected ? accent : hairline}`,
                    boxShadow: selected ? `0 0 0 2px rgba(217,119,6,0.18)` : 'none',
                    transition: 'border-color 120ms, box-shadow 120ms, color 120ms',
                  }}
                >
                  {pageNumberLabel(f, startAt, numbered)}
                </button>
              )
            })}
          </div>

          {/* Position — 3-way segmented */}
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 8 }}>
            {t.pnPosition}
          </label>
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: surfaceBase, borderRadius: 10, padding: 3, border: `1px solid ${hairline}` }}>
            {positions.map((p) => (
              <button
                key={p.key}
                onClick={() => setPosition(p.key)}
                aria-pressed={position === p.key}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: position === p.key ? '#fff' : 'transparent',
                  color: position === p.key ? chrome : chromeMuted,
                  boxShadow: position === p.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'background 120ms, color 120ms',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Start at + skip first */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: chrome }}>{t.pnStartAt}</span>
              <input
                type="number"
                min={0}
                value={startAt}
                onChange={(e) => setStartAt(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                style={{
                  width: 64, boxSizing: 'border-box', padding: '7px 10px',
                  border: `1.5px solid ${hairline}`, borderRadius: 8,
                  fontFamily: 'inherit', fontSize: 13, color: chrome, background: '#fff', outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = accent)}
                onBlur={(e) => (e.target.style.borderColor = hairline)}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={skipFirst}
                onChange={(e) => setSkipFirst(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: accent, cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: chrome }}>{t.pnSkipFirst}</span>
                <span style={{ fontSize: 11, color: chromeMuted }}>{t.pnSkipFirstHint}</span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={secondaryBtnStyle} onClick={onClose}>{t.pnCancel}</button>
            <button
              style={primaryBtnStyle}
              onClick={() => onApply({ format, position, startAt, skipFirst })}
            >
              {t.pnApply}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

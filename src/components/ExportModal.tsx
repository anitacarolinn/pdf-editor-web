import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../services/i18n'

interface ExportModalProps {
  defaultName: string
  busy: boolean
  onExport: (name: string) => void
  onClose: () => void
}

const accent = '#d97706'
const chromeMuted = '#71717a'
const chromeSecondary = '#3f3f46'
const surfaceBase = '#f4f4f5'
const hairline = 'rgba(24,24,27,0.09)'

export default function ExportModal({ defaultName, busy, onExport, onClose }: ExportModalProps) {
  const { t } = useI18n()
  // Edit the base name; ".pdf" is shown as a fixed suffix.
  const [name, setName] = useState(() => defaultName.replace(/\.pdf$/i, ''))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = inputRef.current
    if (el) { el.focus(); el.select() }
  }, [])

  // Escape closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const submit = () => { if (name.trim()) onExport(name) }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 400 }}>
          <h2 className="modal-title">{t.exTitle}</h2>
          <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 16 }}>{t.exSubtitle}</p>

          <label style={{ fontSize: 12, fontWeight: 600, color: chromeSecondary, marginBottom: 6, display: 'block' }} htmlFor="export-name">
            {t.exNameLabel}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <input
              id="export-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '9px 12px',
                background: '#fff', border: `1px solid ${hairline}`, borderRadius: 10,
                fontFamily: 'inherit', fontSize: 13, color: '#18181b', outline: 'none',
              }}
            />
            <span style={{ fontFamily: '"Geist Mono Variable", ui-monospace, monospace', fontSize: 13, color: chromeMuted, flexShrink: 0 }}>.pdf</span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              disabled={busy}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 18px',
                background: surfaceBase, border: `1px solid ${hairline}`, borderRadius: 10,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 500, color: chromeSecondary, cursor: 'pointer',
              }}
            >
              {t.exCancel}
            </button>
            <button
              onClick={submit}
              disabled={busy || !name.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 22px',
                background: accent, border: 'none', borderRadius: 10,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff',
                cursor: busy || !name.trim() ? 'not-allowed' : 'pointer', opacity: busy || !name.trim() ? 0.5 : 1,
              }}
            >
              {t.exDownload}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

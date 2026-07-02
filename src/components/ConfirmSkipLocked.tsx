import React from 'react'
import { useI18n } from '../services/i18n'

interface ConfirmSkipLockedProps {
  // Names of the locked file(s) whose password prompt was cancelled.
  skipped: string[]
  // How many other (openable) PDFs/images would open if the user proceeds.
  otherCount: number
  // Proceed: open the rest without the locked file(s).
  onOpenRest: () => void
  // Abort the whole open — nothing opens.
  onCancelAll: () => void
}

// ── Shared style tokens (match PasswordPrompt / UnlockModal) ──────────────
const accent = '#d97706'
const chrome = '#18181b'
const chromeMuted = '#71717a'
const chromeSecondary = '#3f3f46'
const surfaceBase = '#f4f4f5'
const hairline = 'rgba(24,24,27,0.09)'

const secondaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 18px',
  background: surfaceBase,
  border: `1px solid ${hairline}`,
  borderRadius: 10,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 500,
  color: chromeSecondary,
  cursor: 'pointer',
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 22px',
  background: accent,
  border: 'none',
  borderRadius: 10,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
}

export default function ConfirmSkipLocked({
  skipped,
  otherCount,
  onOpenRest,
  onCancelAll,
}: ConfirmSkipLockedProps) {
  const { t } = useI18n()
  return (
    <div className="modal-backdrop" onClick={onCancelAll}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 380 }}>
          <h2 className="modal-title">{t.slcTitle}</h2>
          <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 12 }}>
            {t.slcExplain}
          </p>

          {/* Name the skipped file(s) so the user knows exactly what is left out. */}
          <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
            {skipped.map((name) => (
              <li
                key={name}
                style={{ fontSize: 13, fontWeight: 600, color: chrome, wordBreak: 'break-all' }}
              >
                {name}
              </li>
            ))}
          </ul>

          <p style={{ fontSize: 12.5, color: chromeMuted, margin: '0 0 16px' }}>
            {t.slcQuestion(otherCount)}
          </p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={secondaryBtnStyle} onClick={onCancelAll}>{t.slcCancelAll}</button>
            <button style={primaryBtnStyle} onClick={onOpenRest}>{t.slcOpenRest}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

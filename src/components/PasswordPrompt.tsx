import React, { useState } from 'react'
import { useI18n } from '../services/i18n'

interface PasswordPromptProps {
  // The name of the locked file — shown so the user knows which file needs the
  // password (important when several files are dropped at once).
  fileName: string
  // An inline error to display (e.g. after a wrong password). When set, the
  // modal stays open so the user can retry.
  error?: string | null
  busy?: boolean
  onSubmit: (password: string) => void
  onCancel: () => void
}

// ── Shared style tokens (match UnlockModal / LockModal) ───────────────────
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 12px',
  background: '#fff',
  border: `1px solid ${hairline}`,
  borderRadius: 10,
  fontFamily: 'inherit',
  fontSize: 13,
  color: chrome,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: chromeSecondary,
  marginBottom: 6,
  display: 'block',
}

export default function PasswordPrompt({
  fileName,
  error,
  busy = false,
  onSubmit,
  onCancel,
}: PasswordPromptProps) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')

  const submit = () => {
    if (busy) return
    onSubmit(password)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 380 }}>
          <h2 className="modal-title">{t.ppTitle}</h2>
          <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 16 }}>
            {t.ppSubtitle}
          </p>

          {/* Name the file so the user knows which one needs unlocking. */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: chrome,
              margin: '0 0 14px',
              wordBreak: 'break-all',
            }}
          >
            {fileName}
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="open-password">{t.ppPasswordLabel}</label>
            <input
              id="open-password"
              type="password"
              aria-label={t.ppPasswordLabel}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              style={inputStyle}
              autoFocus
            />
          </div>

          {error && (
            <p role="alert" style={{ fontSize: 12.5, color: '#dc2626', margin: '0 0 14px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={secondaryBtnStyle} onClick={onCancel} disabled={busy}>{t.ppCancel}</button>
            <button style={primaryBtnStyle} onClick={submit} disabled={busy}>
              {busy ? t.ppUnlocking : t.ppUnlock}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

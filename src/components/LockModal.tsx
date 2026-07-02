import React, { useState } from 'react'
import { lockPdf } from '../services/lock-service'
import { useI18n } from '../services/i18n'

interface LockModalProps {
  bytes: Uint8Array
  // Called with the encrypted bytes; the caller downloads them (we do NOT
  // replace the in-app document — an encrypted PDF can't be re-rendered by the
  // pdf.js viewer).
  onLocked: (result: Uint8Array) => void
  onClose: () => void
}

// ── Shared style tokens (match ShrinkModal) ──────────────────────────────
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

export default function LockModal({ bytes, onLocked, onClose }: LockModalProps) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLock = async () => {
    setError(null)
    if (!password) {
      setError(t.lmErrEnterPassword)
      return
    }
    if (password !== confirm) {
      setError(t.lmErrNoMatch)
      return
    }
    setBusy(true)
    try {
      const out = await lockPdf(bytes, password)
      onLocked(out)
    } catch (e) {
      console.error('lock failed', e)
      setError(e instanceof Error ? e.message : t.lmErrFailed)
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 380 }}>
          <h2 className="modal-title">{t.lmTitle}</h2>
          <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 16 }}>
            {t.lmSubtitle}
          </p>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle} htmlFor="lock-password">{t.lmPasswordLabel}</label>
            <input
              id="lock-password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle} htmlFor="lock-confirm">{t.lmConfirmLabel}</label>
            <input
              id="lock-confirm"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLock() }}
              style={inputStyle}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: chromeMuted, marginBottom: 18, cursor: 'pointer' }}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            {t.lmShowPassword}
          </label>

          {error && (
            <p role="alert" style={{ fontSize: 12.5, color: '#dc2626', margin: '0 0 14px' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={secondaryBtnStyle} onClick={onClose} disabled={busy}>{t.lmCancel}</button>
            <button style={primaryBtnStyle} onClick={handleLock} disabled={busy}>
              {busy ? t.lmLocking : t.lmLockDownload}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

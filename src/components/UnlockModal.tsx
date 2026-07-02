import React, { useRef, useState } from 'react'
import { unlockPdf } from '../services/lock-service'
import { readFileAsBytes } from '../services/file-io'
import { useI18n } from '../services/i18n'

interface UnlockModalProps {
  // Called with the decrypted bytes + a suggested file name; the caller loads
  // them as the working document.
  onUnlocked: (result: Uint8Array, fileName: string) => void
  onClose: () => void
}

// ── Shared style tokens (match ShrinkModal / LockModal) ───────────────────
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

export default function UnlockModal({ onUnlocked, onClose }: UnlockModalProps) {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUnlock = async () => {
    setError(null)
    if (!file) {
      setError(t.umErrChooseFile)
      return
    }
    setBusy(true)
    try {
      const bytes = await readFileAsBytes(file)
      const out = await unlockPdf(bytes, password)
      const name = file.name.replace(/\.pdf$/i, '') + '.pdf'
      onUnlocked(out, name)
    } catch (e) {
      console.error('unlock failed', e)
      setError(e instanceof Error ? e.message : t.umErrWrongPassword)
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 380 }}>
          <h2 className="modal-title">{t.umTitle}</h2>
          <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 16 }}>
            {t.umSubtitle}
          </p>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{t.umPdfFileLabel}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                setError(null)
                e.target.value = ''
              }}
            />
            <button
              style={{ ...secondaryBtnStyle, width: '100%', padding: '9px 12px', justifyContent: 'flex-start' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? file.name : t.umChooseFile}
            </button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle} htmlFor="unlock-password">{t.umPasswordLabel}</label>
            <input
              id="unlock-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock() }}
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
            <button style={secondaryBtnStyle} onClick={onClose} disabled={busy}>{t.umCancel}</button>
            <button style={primaryBtnStyle} onClick={handleUnlock} disabled={busy}>
              {busy ? t.umUnlocking : t.umUnlockOpen}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

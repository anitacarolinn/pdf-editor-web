import React, { useState } from 'react'
import { shrinkPdfWithLevel } from '../services/shrink-service'
import type { CompressionLevel } from '../services/shrink-service'
import { useI18n } from '../services/i18n'

interface ShrinkModalProps {
  bytes: Uint8Array
  onApply: (result: Uint8Array) => void
  onClose: () => void
}

type Step = 'options' | 'loading' | 'result'

interface LevelMeta {
  id: CompressionLevel
  labelKey: 'smLevelLessLabel' | 'smLevelRecommendedLabel' | 'smLevelExtremeLabel'
  descKey: 'smLevelLessDesc' | 'smLevelRecommendedDesc' | 'smLevelExtremeDesc'
}

const LEVELS: LevelMeta[] = [
  {
    id: 'less',
    labelKey: 'smLevelLessLabel',
    descKey: 'smLevelLessDesc',
  },
  {
    id: 'recommended',
    labelKey: 'smLevelRecommendedLabel',
    descKey: 'smLevelRecommendedDesc',
  },
  {
    id: 'extreme',
    labelKey: 'smLevelExtremeLabel',
    descKey: 'smLevelExtremeDesc',
  },
]

function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`
  if (n >= 1_024)     return `${(n / 1_024).toFixed(0)} KB`
  return `${n} B`
}

export default function ShrinkModal({ bytes, onApply, onClose }: ShrinkModalProps) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('options')
  const [level, setLevel] = useState<CompressionLevel>('recommended')
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)

  const handleCompress = async () => {
    setStep('loading')
    try {
      const out = await shrinkPdfWithLevel(bytes, level)
      setResultBytes(out)
      setStep('result')
    } catch (e) {
      console.error('shrink failed', e)
      setStep('options')
    }
  }

  const handleApply = () => {
    if (resultBytes) onApply(resultBytes)
  }

  const handleBack = () => {
    setResultBytes(null)
    setStep('options')
  }

  const originalSize = bytes.length
  const newSize = resultBytes?.length ?? 0
  const reduced = originalSize > 0
    ? Math.round(((originalSize - newSize) / originalSize) * 100)
    : 0
  const isSmaller = newSize < originalSize

  // ── Shared style tokens (inline — no toolbar-* classes touched) ──────────
  const accent = '#d97706'
  const accentSurface = 'rgba(217,119,6,0.08)'
  const accentRing = 'rgba(217,119,6,0.35)'
  const chrome = '#18181b'
  const chromeMuted = '#71717a'
  const chromeSecondary = '#3f3f46'
  const surfaceCard = '#ffffff'
  void surfaceCard // referenced in design tokens, not used directly
  const surfaceBase = '#f4f4f5'
  const hairline = 'rgba(24,24,27,0.09)'

  const applyBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 22px',
    background: '#16a34a',
    border: 'none',
    borderRadius: 10,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  }

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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 380 }}>

          {/* ── OPTIONS STEP ─────────────────────────────────────── */}
          {step === 'options' && (
            <>
              <h2 className="modal-title">{t.smTitle}</h2>
              <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 16 }}>
                {t.smSubtitle}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {LEVELS.map((lv) => {
                  const selected = level === lv.id
                  return (
                    <button
                      key={lv.id}
                      onClick={() => setLevel(lv.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '10px 14px',
                        background: selected ? accentSurface : surfaceBase,
                        border: `1.5px solid ${selected ? accent : hairline}`,
                        borderRadius: 10,
                        boxShadow: selected ? `0 0 0 2px ${accentRing}` : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'border-color 120ms, box-shadow 120ms',
                      }}
                      aria-pressed={selected}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: selected ? accent : chrome }}>
                        {t[lv.labelKey]}
                      </span>
                      <span style={{ fontSize: 11.5, color: chromeMuted, marginTop: 2 }}>
                        {t[lv.descKey]}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={secondaryBtnStyle} onClick={onClose}>{t.smCancel}</button>
                <button style={primaryBtnStyle} onClick={handleCompress}>{t.smCompress}</button>
              </div>
            </>
          )}

          {/* ── LOADING STEP ─────────────────────────────────────── */}
          {step === 'loading' && (
            <>
              <h2 className="modal-title">{t.smCompressing}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
                {/* CSS spinner — no external deps */}
                <div
                  aria-label="Compressing"
                  style={{
                    width: 36,
                    height: 36,
                    border: `3px solid ${hairline}`,
                    borderTopColor: accent,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ marginTop: 14, fontSize: 12.5, color: chromeMuted }}>
                  Re-encoding pages…
                </p>
              </div>
            </>
          )}

          {/* ── RESULT STEP ──────────────────────────────────────── */}
          {step === 'result' && resultBytes && (
            <>
              <h2 className="modal-title">{t.smResultTitle}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {/* Row: Original */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', background: surfaceBase, borderRadius: 8,
                  border: `1px solid ${hairline}`,
                }}>
                  <span style={{ fontSize: 12.5, color: chromeMuted, fontWeight: 500 }}>{t.smOriginal}</span>
                  <span style={{ fontSize: 13, color: chrome, fontWeight: 600 }}>
                    {formatBytes(originalSize)}
                  </span>
                </div>
                {/* Row: New size */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', background: surfaceBase, borderRadius: 8,
                  border: `1px solid ${hairline}`,
                }}>
                  <span style={{ fontSize: 12.5, color: chromeMuted, fontWeight: 500 }}>{t.smNewSize}</span>
                  <span style={{ fontSize: 13, color: chrome, fontWeight: 600 }}>
                    {formatBytes(newSize)}
                  </span>
                </div>
                {/* Row: Reduction */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px',
                  background: isSmaller ? 'rgba(22,163,74,0.07)' : accentSurface,
                  borderRadius: 8,
                  border: `1px solid ${isSmaller ? 'rgba(22,163,74,0.2)' : hairline}`,
                }}>
                  <span style={{ fontSize: 12.5, color: chromeMuted, fontWeight: 500 }}>
                    {isSmaller ? t.smReducedBy : t.smResult}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSmaller ? '#16a34a' : chromeMuted }}>
                    {isSmaller
                      ? `${reduced}%`
                      : t.smAlreadyOptimized}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={secondaryBtnStyle} onClick={handleBack}>{t.smBack}</button>
                {isSmaller && (
                  <button style={applyBtnStyle} onClick={handleApply}>{t.smApply}</button>
                )}
                {!isSmaller && (
                  <button style={secondaryBtnStyle} onClick={onClose}>{t.smClose}</button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

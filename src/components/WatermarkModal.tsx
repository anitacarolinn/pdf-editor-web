import React, { useRef, useState } from 'react'
import type { WatermarkOpts } from '../services/page-ops'

interface WatermarkModalProps {
  onApply: (opts: WatermarkOpts) => void
  onClose: () => void
}

export default function WatermarkModal({ onApply, onClose }: WatermarkModalProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('DRAFT')
  const [opacity, setOpacity] = useState(0.25)
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null)
  const [imageType, setImageType] = useState<'png' | 'jpeg'>('png')
  const [imageName, setImageName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const accent = '#d97706'
  const accentSurface = 'rgba(217,119,6,0.08)'
  const accentRing = 'rgba(217,119,6,0.35)'
  const chrome = '#18181b'
  const chromeMuted = '#71717a'
  const chromeSecondary = '#3f3f46'
  const surfaceBase = '#f4f4f5'
  const hairline = 'rgba(24,24,27,0.09)'

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

  const handleImageFile = (file: File) => {
    const type = file.type === 'image/jpeg' ? 'jpeg' : 'png'
    setImageType(type)
    setImageName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const buf = e.target?.result
      if (buf instanceof ArrayBuffer) setImageBytes(new Uint8Array(buf))
    }
    reader.readAsArrayBuffer(file)
  }

  const handleApply = () => {
    if (mode === 'text') {
      if (!text.trim()) return
      onApply({ kind: 'text', text: text.trim(), opacity })
    } else {
      if (!imageBytes) return
      onApply({ kind: 'image', imageBytes, imageType, opacity })
    }
  }

  const canApply = mode === 'text' ? text.trim().length > 0 : imageBytes !== null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: 400 }}>
        <div className="modal-inner" style={{ minWidth: 'unset', maxWidth: 'unset', width: 420 }}>
          <h2 className="modal-title">Add Watermark</h2>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: surfaceBase, borderRadius: 10, padding: 3, border: `1px solid ${hairline}` }}>
            {(['text', 'image'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? chrome : chromeMuted,
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'background 120ms, color 120ms',
                }}
                aria-pressed={mode === m}
              >
                {m === 'text' ? 'Text' : 'Image'}
              </button>
            ))}
          </div>

          {/* Text mode */}
          {mode === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  Watermark text
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. DRAFT"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 12px', border: `1.5px solid ${hairline}`, borderRadius: 8,
                    fontFamily: 'inherit', fontSize: 14, color: chrome, background: '#fff',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = accent)}
                  onBlur={(e) => (e.target.style.borderColor = hairline)}
                />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  <span>Opacity</span>
                  <span style={{ color: accent }}>{Math.round(opacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.05} max={1} step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: accent }}
                />
              </div>
            </div>
          )}

          {/* Image mode */}
          {mode === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  Image (PNG or JPG)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', border: `1.5px dashed ${imageBytes ? accent : hairline}`,
                    borderRadius: 8, cursor: 'pointer', background: imageBytes ? accentSurface : surfaceBase,
                    boxShadow: imageBytes ? `0 0 0 2px ${accentRing}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 13, color: imageBytes ? accent : chromeMuted }}>
                    {imageBytes ? imageName : 'Click to choose image…'}
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageFile(f)
                    e.target.value = ''
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: chrome, marginBottom: 5 }}>
                  <span>Opacity</span>
                  <span style={{ color: accent }}>{Math.round(opacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.05} max={1} step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: accent }}
                />
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: chromeMuted }}>
                Image will be centered on each page at ~40% page width.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={secondaryBtnStyle} onClick={onClose}>Cancel</button>
            <button
              style={{ ...primaryBtnStyle, opacity: canApply ? 1 : 0.5, cursor: canApply ? 'pointer' : 'not-allowed' }}
              onClick={handleApply}
              disabled={!canApply}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignatureModalProps {
  onAdd: (bytes: Uint8Array) => void
  onClose: () => void
}

// ── Shared style tokens (mirrors ShrinkModal / light theme) ──────────
const accent = '#d97706'
const chrome = '#18181b'
const chromeMuted = '#71717a'
const chromeSecondary = '#3f3f46'
const surfaceBase = '#f4f4f5'
const hairline = 'rgba(24,24,27,0.09)'

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

const primaryBtnDisabledStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
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

/** Convert a data-URL to a Uint8Array */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export default function SignatureModal({ onAdd, onClose }: SignatureModalProps) {
  const sigRef = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleClear = () => {
    sigRef.current?.clear()
    setIsEmpty(true)
  }

  const handleAdd = () => {
    if (!sigRef.current || isEmpty) return
    try {
      // getTrimmedCanvas trims whitespace — this gives a clean transparent-bg PNG.
      // Falls back to the raw canvas if the trim-canvas dep has an ESM interop issue.
      const trimmedCanvas = sigRef.current.getTrimmedCanvas()
      const dataUrl = trimmedCanvas.toDataURL('image/png')
      onAdd(dataUrlToBytes(dataUrl))
    } catch {
      // Fallback: export the full canvas (transparent background, strokes intact)
      const rawCanvas = sigRef.current.getCanvas()
      const dataUrl = rawCanvas.toDataURL('image/png')
      onAdd(dataUrlToBytes(dataUrl))
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1500 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 460 }}
      >
        <div
          className="modal-inner"
          style={{ minWidth: 'unset', maxWidth: 'unset', width: 460 }}
        >
          <h2 className="modal-title">Draw your signature</h2>
          <p style={{ fontSize: 12.5, color: chromeMuted, marginTop: 0, marginBottom: 12 }}>
            Draw in the box below. The signature will be placed as a movable overlay on the page.
          </p>

          {/* Signature pad container */}
          <div
            data-testid="signature-pad-container"
            style={{
              border: `1.5px solid ${hairline}`,
              borderRadius: 10,
              overflow: 'hidden',
              background: '#fff',
              marginBottom: 14,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor={chrome}
              backgroundColor="rgba(255,255,255,0)"
              canvasProps={{
                width: 428,
                height: 180,
                style: { display: 'block' },
                'aria-label': 'Signature drawing area',
              }}
              onEnd={() => setIsEmpty(sigRef.current?.isEmpty() ?? true)}
            />
          </div>

          {/* Hint */}
          <p style={{ fontSize: 11.5, color: chromeMuted, marginTop: 0, marginBottom: 16, textAlign: 'center' }}>
            {isEmpty ? 'Draw your signature above' : 'Looking good — click "Add signature" when ready'}
          </p>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <button style={secondaryBtnStyle} onClick={handleClear} title="Clear the drawing">
              Clear
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={secondaryBtnStyle} onClick={onClose}>
                Cancel
              </button>
              <button
                style={isEmpty ? primaryBtnDisabledStyle : primaryBtnStyle}
                disabled={isEmpty}
                onClick={handleAdd}
                title="Place signature on page"
              >
                Add signature
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

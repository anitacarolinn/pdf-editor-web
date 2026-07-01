import { useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import type { OverlayObject } from '../services/overlay-store'

interface Props {
  obj: OverlayObject
  pageWidthPx: number
  pageHeightPx: number
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<OverlayObject>) => void
  onDelete: () => void
}

export default function OverlayObjectView({
  obj,
  pageWidthPx,
  pageHeightPx,
  selected,
  onSelect,
  onChange,
  onDelete,
}: Props) {
  const [objectURL, setObjectURL] = useState<string | null>(null)
  const textRef = useRef<HTMLDivElement>(null)

  // Sync text content when obj.text changes externally
  useEffect(() => {
    if (obj.type === 'text' && textRef.current && textRef.current.textContent !== (obj.text ?? '')) {
      textRef.current.textContent = obj.text ?? ''
    }
  }, [obj.text, obj.type])

  // Create and revoke object URL for image objects
  useEffect(() => {
    if (obj.type !== 'image' || !obj.imageBytes) return
    const mime = obj.imageType === 'jpeg' ? 'image/jpeg' : 'image/png'
    const blob = new Blob([obj.imageBytes as BlobPart], { type: mime })
    const url = URL.createObjectURL(blob)
    setObjectURL(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [obj.type, obj.imageBytes, obj.imageType])

  const x = obj.xPct * pageWidthPx
  const y = obj.yPct * pageHeightPx
  const width = obj.wPct * pageWidthPx
  const height = obj.hPct * pageHeightPx
  const fontSize = (obj.fontSizePct ?? 0.03) * pageHeightPx

  const borderStyle: React.CSSProperties = selected
    ? {
        outline: '2px solid var(--color-accent, #d97706)',
        outlineOffset: '1px',
        boxShadow: '0 0 0 4px var(--color-accent-ring, rgba(217,119,6,0.25))',
      }
    : {}

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      onMouseDown={onSelect}
      onDragStop={(_e, d) => {
        onChange({ xPct: d.x / pageWidthPx, yPct: d.y / pageHeightPx })
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        onChange({
          wPct: ref.offsetWidth / pageWidthPx,
          hPct: ref.offsetHeight / pageHeightPx,
          xPct: pos.x / pageWidthPx,
          yPct: pos.y / pageHeightPx,
        })
      }}
      style={{
        position: 'absolute',
        ...borderStyle,
      }}
    >
      {/* Delete button — shown only when selected */}
      {selected && (
        <button
          aria-label="Delete object"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'var(--color-accent, #d97706)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '11px',
            lineHeight: '20px',
            textAlign: 'center',
            padding: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      )}

      {obj.type === 'text' && (
        <div
          ref={textRef}
          data-testid="overlay-text"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange({ text: e.currentTarget.textContent ?? '' })}
          style={{
            width: '100%',
            height: '100%',
            fontSize: `${fontSize}px`,
            color: obj.color ?? '#000000',
            outline: 'none',
            cursor: 'text',
            wordBreak: 'break-word',
            overflow: 'hidden',
            userSelect: 'text',
          }}
        >
          {obj.text}
        </div>
      )}

      {obj.type === 'image' && objectURL && (
        <img
          src={objectURL}
          alt=""
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        />
      )}
    </Rnd>
  )
}

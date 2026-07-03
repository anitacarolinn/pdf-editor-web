import { useState } from 'react'
import { useMarkupStore, markupForPage } from '../services/markup-store'
import type { MarkupObject, MarkupType, RectPct } from '../services/markup-store'
import { useI18n } from '../services/i18n'

// Thin bar height for underline/strikethrough, as a percentage of the rect's own height.
const BAR_HEIGHT_PCT = 12

function boxStyle(r: RectPct): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${r.xPct * 100}%`,
    top: `${r.yPct * 100}%`,
    width: `${r.wPct * 100}%`,
    height: `${r.hPct * 100}%`,
    pointerEvents: 'auto',
    cursor: 'pointer',
  }
}

// underline sits flush with the bottom of the rect; strikethrough sits at the vertical middle.
function barStyle(type: MarkupType, color: string): React.CSSProperties | null {
  if (type === 'highlight') return null
  const topPct = type === 'underline' ? 100 - BAR_HEIGHT_PCT : 50 - BAR_HEIGHT_PCT / 2
  return {
    position: 'absolute',
    left: 0,
    top: `${topPct}%`,
    width: '100%',
    height: `${BAR_HEIGHT_PCT}%`,
    background: color,
  }
}

export default function MarkupLayer({ page }: { page: number }) {
  const { objects, removeMarkup } = useMarkupStore()
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pageMarkup = markupForPage(objects, page)

  return (
    <div
      data-testid="markup-layer"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}
    >
      {pageMarkup.map((m: MarkupObject) =>
        m.rects.map((r, i) => {
          const bar = barStyle(m.type, m.color)
          return (
            <div
              key={`${m.id}-${i}`}
              data-testid="markup-rect"
              style={{
                ...boxStyle(r),
                background: m.type === 'highlight' ? m.color : 'transparent',
                opacity: m.type === 'highlight' ? 0.4 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(m.id)
              }}
            >
              {bar && <div style={bar} />}
              {selectedId === m.id && i === 0 && (
                <button
                  aria-label={t.tlDeleteMarkup}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeMarkup(m.id)
                    setSelectedId(null)
                  }}
                  style={{
                    position: 'absolute',
                    top: -22,
                    right: 0,
                    fontSize: 12,
                    lineHeight: 1,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )
        }),
      )}
    </div>
  )
}

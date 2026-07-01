export default function PreviewControls({
  page, pageCount, zoom, onGo, onZoom,
}: {
  page: number
  pageCount: number
  zoom: number
  onGo: (p: number) => void
  onZoom: (z: number | 'fit') => void
}) {
  const clamp = (p: number) => Math.min(Math.max(1, p), pageCount)
  const commit = (raw: string) => { const p = clamp(Number(raw)); if (p !== page) onGo(p) }
  return (
    <div className="preview-controls">
      <button
        aria-label="Previous page"
        className="preview-btn"
        disabled={page <= 1}
        onClick={() => onGo(clamp(page - 1))}
      >
        ◀
      </button>
      <input
        aria-label="Current page"
        type="number"
        min={1}
        max={pageCount}
        className="preview-input"
        defaultValue={page}
        key={page}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
        onBlur={(e) => commit(e.target.value)}
      />
      <span style={{ fontSize: '12px', color: 'var(--color-chrome-muted)', fontWeight: 400 }}>
        / {pageCount}
      </span>
      <button
        aria-label="Next page"
        className="preview-btn"
        disabled={page >= pageCount}
        onClick={() => onGo(clamp(page + 1))}
      >
        ▶
      </button>
      <span className="preview-sep" />
      <button
        aria-label="Zoom out"
        className="preview-btn"
        onClick={() => onZoom(Math.max(0.25, zoom - 0.25))}
        style={{ fontSize: '16px', lineHeight: 1 }}
      >
        −
      </button>
      <span className="preview-zoom-label">{Math.round(zoom * 100)}%</span>
      <button
        aria-label="Zoom in"
        className="preview-btn"
        onClick={() => onZoom(Math.min(5, zoom + 0.25))}
        style={{ fontSize: '16px', lineHeight: 1 }}
      >
        +
      </button>
      <button
        aria-label="Fit width"
        className="preview-btn"
        onClick={() => onZoom('fit')}
        style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.02em', width: 'auto', padding: '0 8px' }}
      >
        Fit
      </button>
    </div>
  )
}

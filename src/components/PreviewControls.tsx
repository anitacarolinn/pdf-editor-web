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
    <div className="flex items-center gap-2 border-b bg-white px-3 py-1 text-sm">
      <button aria-label="Previous page" className="px-2 disabled:opacity-40"
        disabled={page <= 1} onClick={() => onGo(clamp(page - 1))}>◀</button>
      <input aria-label="Current page" type="number" min={1} max={pageCount}
        className="w-14 rounded border px-1 text-center" defaultValue={page} key={page}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
        onBlur={(e) => commit(e.target.value)} />
      <span className="text-slate-500">/ {pageCount}</span>
      <button aria-label="Next page" className="px-2 disabled:opacity-40"
        disabled={page >= pageCount} onClick={() => onGo(clamp(page + 1))}>▶</button>
      <span className="mx-2 w-px self-stretch bg-slate-200" />
      <button aria-label="Zoom out" className="px-2" onClick={() => onZoom(Math.max(0.25, zoom - 0.25))}>−</button>
      <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" className="px-2" onClick={() => onZoom(Math.min(5, zoom + 0.25))}>+</button>
      <button aria-label="Fit width" className="px-2" onClick={() => onZoom('fit')}>Fit</button>
    </div>
  )
}

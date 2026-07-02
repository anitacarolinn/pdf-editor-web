import type { PdfInfo } from '../services/metadata'
import { useI18n } from '../services/i18n'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

interface InfoModalProps {
  info: PdfInfo
  fileSize: number
  shrink?: { original: number; shrunk: number } | null
  onClose: () => void
}

export default function InfoModal({ info, fileSize, shrink, onClose }: InfoModalProps) {
  const { t } = useI18n()
  const rows: [string, string | number][] = [
    [t.infoPages, info.pageCount],
    [t.infoFileSize, formatBytes(fileSize)],
    [t.infoPageTitle, info.title || '—'],
    [t.infoAuthor, info.author || '—'],
    [t.infoSubject, info.subject || '—'],
    [t.infoCreator, info.creator || '—'],
    [t.infoProducer, info.producer || '—'],
    [t.infoPageSize, info.pageSizes[0] ? `${info.pageSizes[0].width} × ${info.pageSizes[0].height} pt` : '—'],
  ]
  if (shrink && shrink.original > 0) {
    const pct = Math.max(0, Math.round((1 - shrink.shrunk / shrink.original) * 100))
    rows.push([t.infoCompressed, `${formatBytes(shrink.original)} → ${formatBytes(shrink.shrunk)}  (−${pct}%)`])
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* Outer shell — Double-Bezel */}
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Inner core */}
        <div className="modal-inner">
          <h2 className="modal-title">{t.infoTitle}</h2>
          <table className="modal-table">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="modal-close" onClick={onClose}>
            {t.infoClose}
          </button>
        </div>
      </div>
    </div>
  )
}

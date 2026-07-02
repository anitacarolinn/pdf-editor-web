import type { PdfInfo } from '../services/metadata'
import { useI18n } from '../services/i18n'

export default function InfoModal({ info, onClose }: { info: PdfInfo; onClose: () => void }) {
  const { t } = useI18n()
  const rows: [string, string | number][] = [
    [t.infoPages, info.pageCount],
    [t.infoPageTitle, info.title || '—'],
    [t.infoAuthor, info.author || '—'],
    [t.infoSubject, info.subject || '—'],
    [t.infoCreator, info.creator || '—'],
    [t.infoProducer, info.producer || '—'],
    [t.infoPageSize, info.pageSizes[0] ? `${info.pageSizes[0].width} × ${info.pageSizes[0].height} pt` : '—'],
  ]
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

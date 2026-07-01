import type { PdfInfo } from '../services/metadata'

export default function InfoModal({ info, onClose }: { info: PdfInfo; onClose: () => void }) {
  const rows: [string, string | number][] = [
    ['Pages', info.pageCount],
    ['Title', info.title || '—'],
    ['Author', info.author || '—'],
    ['Subject', info.subject || '—'],
    ['Creator', info.creator || '—'],
    ['Producer', info.producer || '—'],
    ['Page size', info.pageSizes[0] ? `${info.pageSizes[0].width} × ${info.pageSizes[0].height} pt` : '—'],
  ]
  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* Outer shell — Double-Bezel */}
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Inner core */}
        <div className="modal-inner">
          <h2 className="modal-title">Document Info</h2>
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
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

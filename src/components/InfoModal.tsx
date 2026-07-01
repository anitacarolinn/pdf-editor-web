import type { PdfInfo } from '../services/metadata'

export default function InfoModal({ info, onClose }: { info: PdfInfo; onClose: () => void }) {
  const rows: [string, string | number][] = [
    ['Pages', info.pageCount],
    ['Title', info.title || '—'],
    ['Author', info.author || '—'],
    ['Subject', info.subject || '—'],
    ['Creator', info.creator || '—'],
    ['Producer', info.producer || '—'],
  ]
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div className="w-80 rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">Document Info</h2>
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="py-1 pr-4 text-slate-500">{k}</td>
                <td className="py-1">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mt-4 rounded bg-slate-800 px-3 py-1 text-sm text-white" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

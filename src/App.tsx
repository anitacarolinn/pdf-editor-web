import Toolbar from './components/Toolbar'
import ThumbnailRail from './components/ThumbnailRail'
import Viewer from './components/Viewer'
import { useDocumentStore } from './services/document-store'

export default function App() {
  const bytes = useDocumentStore((s) => s.bytes)
  return (
    <div className="flex h-screen flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <ThumbnailRail />
        <Viewer>
          {!bytes && (
            <div className="grid h-full place-items-center text-slate-500">
              Open a PDF to get started
            </div>
          )}
        </Viewer>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useOverlayStore, objectsForPage } from '../services/overlay-store'
import OverlayObjectView from './OverlayObjectView'

interface Props {
  page: number
  pageWidthPx: number
  pageHeightPx: number
}

export default function OverlayLayer({ page, pageWidthPx, pageHeightPx }: Props) {
  const { objects, updateObject, removeObject } = useOverlayStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pageObjects = objectsForPage(objects, page)

  return (
    <div
      data-testid="overlay-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      onClick={(e) => {
        // Deselect when clicking on the overlay background
        if (e.target === e.currentTarget) setSelectedId(null)
      }}
    >
      {pageObjects.map((obj) => (
        <div
          key={obj.id}
          style={{ pointerEvents: 'auto' }}
        >
          <OverlayObjectView
            obj={obj}
            pageWidthPx={pageWidthPx}
            pageHeightPx={pageHeightPx}
            selected={selectedId === obj.id}
            onSelect={() => setSelectedId(obj.id)}
            onChange={(patch) => updateObject(obj.id, patch)}
            onDelete={() => {
              removeObject(obj.id)
              if (selectedId === obj.id) setSelectedId(null)
            }}
          />
        </div>
      ))}
    </div>
  )
}

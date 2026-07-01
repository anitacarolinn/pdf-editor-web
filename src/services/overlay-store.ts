import { create } from 'zustand'

export interface OverlayObject {
  id: string
  page: number
  type: 'text' | 'image'
  xPct: number
  yPct: number
  wPct: number
  hPct: number
  text?: string
  fontSizePct?: number
  color?: string
  imageBytes?: Uint8Array
  imageType?: 'png' | 'jpeg'
}

let _counter = 0
const nextId = () => `o${++_counter}`

interface OverlayState {
  objects: OverlayObject[]
  addText: (page: number) => string
  addImage: (page: number, imageBytes: Uint8Array, imageType: 'png' | 'jpeg', wPct: number, hPct: number) => string
  updateObject: (id: string, patch: Partial<OverlayObject>) => void
  removeObject: (id: string) => void
  clear: () => void
}

export const useOverlayStore = create<OverlayState>((set) => ({
  objects: [],
  addText: (page) => {
    const id = nextId()
    set((s) => ({
      objects: [
        ...s.objects,
        { id, page, type: 'text', xPct: 0.3, yPct: 0.4, wPct: 0.4, hPct: 0.08,
          text: 'Text', fontSizePct: 0.03, color: '#000000' },
      ],
    }))
    return id
  },
  addImage: (page, imageBytes, imageType, wPct, hPct) => {
    const id = nextId()
    set((s) => ({
      objects: [
        ...s.objects,
        { id, page, type: 'image', xPct: 0.3, yPct: 0.3, wPct, hPct, imageBytes, imageType },
      ],
    }))
    return id
  },
  updateObject: (id, patch) =>
    set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),
  clear: () => set({ objects: [] }),
}))

export function objectsForPage(objects: OverlayObject[], page: number): OverlayObject[] {
  return objects.filter((o) => o.page === page)
}

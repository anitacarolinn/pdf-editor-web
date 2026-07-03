import { create } from 'zustand'

export interface RectPct {
  xPct: number
  yPct: number
  wPct: number
  hPct: number
}

export type MarkupType = 'highlight' | 'underline' | 'strikethrough'

export interface MarkupObject {
  id: string
  page: number
  type: MarkupType
  color: string
  rects: RectPct[]
}

let _counter = 0
const nextId = () => `m${++_counter}`

interface MarkupState {
  objects: MarkupObject[]
  addMarkup: (page: number, type: MarkupType, color: string, rects: RectPct[]) => string
  removeMarkup: (id: string) => void
  clear: () => void
}

export const useMarkupStore = create<MarkupState>((set) => ({
  objects: [],
  addMarkup: (page, type, color, rects) => {
    const id = nextId()
    set((s) => ({ objects: [...s.objects, { id, page, type, color, rects }] }))
    return id
  },
  removeMarkup: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),
  clear: () => set({ objects: [] }),
}))

export function markupForPage(objects: MarkupObject[], page: number): MarkupObject[] {
  return objects.filter((o) => o.page === page)
}

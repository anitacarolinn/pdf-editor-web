import { create } from 'zustand'

interface DocState {
  bytes: Uint8Array | null
  fileName: string | null
  past: Uint8Array[]
  future: Uint8Array[]
  load: (bytes: Uint8Array, fileName: string) => void
  apply: (op: (b: Uint8Array) => Promise<Uint8Array>) => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useDocumentStore = create<DocState>((set, get) => ({
  bytes: null,
  fileName: null,
  past: [],
  future: [],
  load: (bytes, fileName) => set({ bytes, fileName, past: [], future: [] }),
  apply: async (op) => {
    const current = get().bytes
    if (!current) return
    const next = await op(current)
    set((s) => ({ bytes: next, past: [...s.past, current], future: [] }))
  },
  undo: () =>
    set((s) => {
      if (s.past.length === 0 || !s.bytes) return s
      const prev = s.past[s.past.length - 1]
      return {
        bytes: prev,
        past: s.past.slice(0, -1),
        future: [s.bytes, ...s.future],
      }
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0 || !s.bytes) return s
      const next = s.future[0]
      return {
        bytes: next,
        past: [...s.past, s.bytes],
        future: s.future.slice(1),
      }
    }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))

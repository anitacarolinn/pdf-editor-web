import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from './document-store'

const A = new Uint8Array([1])
const B = new Uint8Array([2])

beforeEach(() => {
  useDocumentStore.getState().load(A, 'a.pdf')
})

describe('document-store', () => {
  it('loads bytes and file name', () => {
    const s = useDocumentStore.getState()
    expect(s.bytes).toEqual(A)
    expect(s.fileName).toBe('a.pdf')
    expect(s.canUndo()).toBe(false)
  })

  it('apply runs the op and enables undo', async () => {
    await useDocumentStore.getState().apply(async () => B)
    const s = useDocumentStore.getState()
    expect(s.bytes).toEqual(B)
    expect(s.canUndo()).toBe(true)
  })

  it('undo restores previous bytes and enables redo', async () => {
    await useDocumentStore.getState().apply(async () => B)
    useDocumentStore.getState().undo()
    const s = useDocumentStore.getState()
    expect(s.bytes).toEqual(A)
    expect(s.canRedo()).toBe(true)
  })
})

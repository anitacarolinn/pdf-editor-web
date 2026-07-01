import { describe, it, expect, beforeEach } from 'vitest'
import { useOverlayStore, objectsForPage } from './overlay-store'

beforeEach(() => useOverlayStore.getState().clear())

describe('overlay-store', () => {
  it('adds a text object with defaults and returns its id', () => {
    const id = useOverlayStore.getState().addText(0)
    const objs = useOverlayStore.getState().objects
    expect(objs).toHaveLength(1)
    expect(objs[0].id).toBe(id)
    expect(objs[0].type).toBe('text')
    expect(objs[0].page).toBe(0)
    expect(objs[0].text).toBeTypeOf('string')
  })

  it('updates and removes objects', () => {
    const id = useOverlayStore.getState().addText(0)
    useOverlayStore.getState().updateObject(id, { text: 'Hi', xPct: 0.5 })
    expect(useOverlayStore.getState().objects[0].text).toBe('Hi')
    expect(useOverlayStore.getState().objects[0].xPct).toBe(0.5)
    useOverlayStore.getState().removeObject(id)
    expect(useOverlayStore.getState().objects).toHaveLength(0)
  })

  it('filters objects by page', () => {
    useOverlayStore.getState().addText(0)
    useOverlayStore.getState().addText(2)
    const all = useOverlayStore.getState().objects
    expect(objectsForPage(all, 2)).toHaveLength(1)
    expect(objectsForPage(all, 2)[0].page).toBe(2)
  })
})

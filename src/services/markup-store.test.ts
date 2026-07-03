import { describe, it, expect, beforeEach } from 'vitest'
import { useMarkupStore, markupForPage } from './markup-store'
import type { RectPct } from './markup-store'

const rects: RectPct[] = [{ xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 }]

describe('markup-store', () => {
  beforeEach(() => useMarkupStore.setState({ objects: [] }))

  it('adds a markup and returns its id', () => {
    const id = useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', rects)
    const objs = useMarkupStore.getState().objects
    expect(objs).toHaveLength(1)
    expect(objs[0]).toMatchObject({ id, page: 0, type: 'highlight', color: '#ffd54a', rects })
  })

  it('preserves multi-rect selections intact', () => {
    const multi: RectPct[] = [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
      { xPct: 0.1, yPct: 0.24, wPct: 0.5, hPct: 0.02 },
    ]
    useMarkupStore.getState().addMarkup(2, 'underline', '#000000', multi)
    expect(useMarkupStore.getState().objects[0].rects).toEqual(multi)
  })

  it('removes by id and clears all', () => {
    const id = useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', rects)
    useMarkupStore.getState().addMarkup(1, 'strikethrough', '#000000', rects)
    useMarkupStore.getState().removeMarkup(id)
    expect(useMarkupStore.getState().objects).toHaveLength(1)
    useMarkupStore.getState().clear()
    expect(useMarkupStore.getState().objects).toHaveLength(0)
  })

  it('markupForPage filters by page', () => {
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', rects)
    useMarkupStore.getState().addMarkup(3, 'highlight', '#ffd54a', rects)
    expect(markupForPage(useMarkupStore.getState().objects, 3)).toHaveLength(1)
  })
})

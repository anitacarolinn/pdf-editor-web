import { describe, it, expect } from 'vitest'
import {
  getPageText, extractDocumentText, searchPageText, searchDocument,
} from './text-service'
import type { DocTextSource, TextItemLike } from './text-service'

const page = (items: TextItemLike[]) => ({ getTextContent: async () => ({ items }) })

function fakeDoc(pages: TextItemLike[][]): DocTextSource {
  return { numPages: pages.length, getPage: async (n: number) => page(pages[n - 1]) }
}

describe('text-service — extract', () => {
  it('joins item strings and inserts newlines on hasEOL', async () => {
    const text = await getPageText(page([
      { str: 'Hello ' }, { str: 'world', hasEOL: true }, { str: 'second line' },
    ]))
    expect(text).toBe('Hello world\nsecond line')
  })

  it('preserves non-ASCII (中文, Indonesian) verbatim', async () => {
    const text = await getPageText(page([{ str: '中文 ' }, { str: 'terima kasih' }]))
    expect(text).toBe('中文 terima kasih')
  })

  it('extractDocumentText joins pages with a blank line', async () => {
    const doc = fakeDoc([[{ str: 'p1' }], [{ str: 'p2' }]])
    expect(await extractDocumentText(doc)).toBe('p1\n\np2')
  })
})

describe('text-service — search', () => {
  const items: TextItemLike[] = [
    { str: 'the Fox' }, { str: 'jumped over the fox' },
  ]

  it('finds case-insensitive matches by default across items', () => {
    const hits = searchPageText(items, 'fox')
    // item 0: "the Fox" → start 4 ; item 1: "...the fox" → start 16
    expect(hits).toEqual([
      { itemIndex: 0, start: 4, length: 3 },
      { itemIndex: 1, start: 16, length: 3 },
    ])
  })

  it('respects caseSensitive', () => {
    expect(searchPageText(items, 'Fox', { caseSensitive: true }))
      .toEqual([{ itemIndex: 0, start: 4, length: 3 }])
  })

  it('empty query yields no hits', () => {
    expect(searchPageText(items, '')).toEqual([])
  })

  it('searchDocument tags hits with pageIndex', async () => {
    const doc = fakeDoc([[{ str: 'aXa' }], [{ str: 'bb' }, { str: 'Xy' }]])
    const hits = await searchDocument(doc, 'x')
    expect(hits).toEqual([
      { pageIndex: 0, itemIndex: 0, start: 1, length: 1 },
      { pageIndex: 1, itemIndex: 1, start: 0, length: 1 },
    ])
  })

  it('finds 中文 matches (unicode)', async () => {
    const doc = fakeDoc([[{ str: '你好中文世界' }]])
    const hits = await searchDocument(doc, '中文')
    expect(hits).toEqual([{ pageIndex: 0, itemIndex: 0, start: 2, length: 2 }])
  })
})

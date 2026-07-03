export interface TextItemLike {
  str: string
  hasEOL?: boolean
}
export interface PageTextSource {
  getTextContent(): Promise<{ items: TextItemLike[] }>
}
export interface DocTextSource {
  numPages: number
  getPage(n: number): Promise<PageTextSource>
}

export interface SearchOptions {
  caseSensitive?: boolean
}
export interface SearchHit {
  pageIndex: number
  itemIndex: number
  start: number
  length: number
}

/** Concatenate a page's text items, inserting a newline after items flagged
 *  hasEOL (pdf.js marks end-of-line items). Unicode is passed through verbatim. */
export async function getPageText(page: PageTextSource): Promise<string> {
  const { items } = await page.getTextContent()
  let out = ''
  for (const it of items) {
    out += it.str
    if (it.hasEOL) out += '\n'
  }
  return out
}

export async function extractDocumentText(doc: DocTextSource): Promise<string> {
  const parts: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    parts.push(await getPageText(await doc.getPage(n)))
  }
  return parts.join('\n\n')
}

export function searchPageText(
  items: TextItemLike[],
  query: string,
  opts: SearchOptions = {},
): Array<{ itemIndex: number; start: number; length: number }> {
  const hits: Array<{ itemIndex: number; start: number; length: number }> = []
  if (!query) return hits
  const needle = opts.caseSensitive ? query : query.toLowerCase()
  items.forEach((it, itemIndex) => {
    const hay = opts.caseSensitive ? it.str : it.str.toLowerCase()
    let from = 0
    for (;;) {
      const idx = hay.indexOf(needle, from)
      if (idx === -1) break
      hits.push({ itemIndex, start: idx, length: query.length })
      from = idx + needle.length
    }
  })
  return hits
}

export async function searchDocument(
  doc: DocTextSource,
  query: string,
  opts: SearchOptions = {},
): Promise<SearchHit[]> {
  const hits: SearchHit[] = []
  if (!query) return hits
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent()
    for (const h of searchPageText(items, query, opts)) {
      hits.push({ pageIndex: n - 1, ...h })
    }
  }
  return hits
}

import type { PDFPageProxy } from 'pdfjs-dist'

let _pdfjs: Promise<typeof import('pdfjs-dist')> | null = null
function pdfjsLib() {
  return (_pdfjs ??= import('pdfjs-dist'))
}

/**
 * Render pdf.js's transparent, positioned text spans into `container`, aligned
 * to the page canvas. The canvas is displayed at CSS size `scale` (it renders
 * internally at scale*dpr), so the text layer uses the viewport at `scale` and
 * sets --scale-factor to match. Returns a cancellable handle like
 * renderPageToCanvas.
 */
export function renderTextLayer(
  page: PDFPageProxy,
  scale: number,
  container: HTMLElement,
): { cancel(): void; done: Promise<void> } {
  let layer: { render(): Promise<void>; cancel(): void } | null = null
  let cancelled = false

  const done = (async () => {
    const pdfjs = await pdfjsLib()
    const viewport = page.getViewport({ scale })
    if (cancelled) return
    container.textContent = ''
    container.classList.add('textLayer')
    container.style.setProperty('--scale-factor', String(scale))
    container.style.width = `${viewport.width}px`
    container.style.height = `${viewport.height}px`
    const textContentSource = await page.getTextContent()
    if (cancelled) return
    layer = new pdfjs.TextLayer({ textContentSource, container, viewport }) as unknown as {
      render(): Promise<void>
      cancel(): void
    }
    await layer.render()
  })()

  return {
    cancel() {
      cancelled = true
      layer?.cancel()
    },
    done,
  }
}

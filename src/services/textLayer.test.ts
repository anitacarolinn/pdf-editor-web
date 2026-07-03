import { describe, it, expect, vi } from 'vitest'

const renderSpy = vi.fn().mockResolvedValue(undefined)
const cancelSpy = vi.fn()
const ctor = vi.fn()

vi.mock('pdfjs-dist', () => ({
  TextLayer: class {
    constructor(opts: unknown) { ctor(opts) }
    render() { return renderSpy() }
    cancel() { cancelSpy() }
  },
  GlobalWorkerOptions: { workerSrc: '' },
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker' }))

import { renderTextLayer } from './text-service'

function fakePage() {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: 300 * scale, height: 400 * scale }),
    getTextContent: async () => ({ items: [{ str: 'hi' }] }),
  }
}

describe('renderTextLayer', () => {
  it('builds a TextLayer at the given scale and sets the container up', async () => {
    const container = document.createElement('div')
    const handle = renderTextLayer(fakePage() as never, 2, container)
    await handle.done
    expect(ctor).toHaveBeenCalledOnce()
    const opts = ctor.mock.calls[0][0] as { viewport: { width: number }; container: HTMLElement }
    expect(opts.container).toBe(container)
    expect(opts.viewport.width).toBe(600) // 300 * scale(2)
    expect(container.classList.contains('textLayer')).toBe(true)
    expect(container.style.getPropertyValue('--scale-factor')).toBe('2')
    expect(renderSpy).toHaveBeenCalled()
  })

  it('cancel() forwards to the TextLayer', async () => {
    const container = document.createElement('div')
    const handle = renderTextLayer(fakePage() as never, 1, container)
    await handle.done
    handle.cancel()
    expect(cancelSpy).toHaveBeenCalled()
  })
})

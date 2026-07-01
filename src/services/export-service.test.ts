import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadBytes } from './export-service'

describe('downloadBytes', () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('creates an object url and clicks an anchor with the file name', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadBytes(new Uint8Array([1, 2, 3]), 'out.pdf')
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    clickSpy.mockRestore()
  })
})

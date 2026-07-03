import { describe, it, expect, vi } from 'vitest'
import { readFileAsBytes, downloadText } from './file-io'

describe('readFileAsBytes', () => {
  it('reads a File into a Uint8Array', async () => {
    const file = new File([new Uint8Array([9, 8, 7])], 'x.pdf', { type: 'application/pdf' })
    expect(await readFileAsBytes(file)).toEqual(new Uint8Array([9, 8, 7]))
  })
})

describe('downloadText', () => {
  it('creates a text/plain object URL and triggers a click', () => {
    const createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clicks: string[] = []
    const origClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push(this.download)
    }
    downloadText('中文 hello', 'notes.txt')
    expect(createURL).toHaveBeenCalledOnce()
    const blob = createURL.mock.calls[0][0] as Blob
    expect(blob.type).toContain('text/plain')
    expect(clicks).toContain('notes.txt')
    HTMLAnchorElement.prototype.click = origClick
  })
})

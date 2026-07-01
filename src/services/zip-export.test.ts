import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildZip } from './zip-export'

describe('buildZip', () => {
  it('packs files into a readable zip', async () => {
    const zipped = await buildZip([
      { name: 'a.pdf', bytes: new Uint8Array([1, 2, 3]) },
      { name: 'b.pdf', bytes: new Uint8Array([4, 5]) },
    ])
    const round = await JSZip.loadAsync(zipped)
    expect(Object.keys(round.files).sort()).toEqual(['a.pdf', 'b.pdf'])
    expect(await round.file('a.pdf')!.async('uint8array')).toEqual(new Uint8Array([1, 2, 3]))
  })
})

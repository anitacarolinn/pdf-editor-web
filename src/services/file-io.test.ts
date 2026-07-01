import { describe, it, expect } from 'vitest'
import { readFileAsBytes } from './file-io'

describe('readFileAsBytes', () => {
  it('reads a File into a Uint8Array', async () => {
    const file = new File([new Uint8Array([9, 8, 7])], 'x.pdf', { type: 'application/pdf' })
    expect(await readFileAsBytes(file)).toEqual(new Uint8Array([9, 8, 7]))
  })
})

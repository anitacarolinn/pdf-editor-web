import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'node:path'
import { lockPdf, unlockPdf, __setWasmPathForTests } from './lock-service'
import { makeSamplePdf, getPageCount } from '../test/fixtures'

// This runs the REAL qpdf wasm module (not a mock). The module itself loads and
// executes fine under vitest's Node environment — the only wrinkle is that the
// `?url` asset import resolves to a browser/dev-server URL, not a Node
// filesystem path, so we point Emscripten at the on-disk .wasm via the test
// seam. The round-trip (encrypt then decrypt) preserves the page count, and a
// wrong password makes qpdf exit non-zero, which the service turns into an
// Error.
beforeAll(() => {
  // vitest runs from the project root, so resolve the wasm relative to cwd.
  const wasmPath = resolve(process.cwd(), 'node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm')
  __setWasmPathForTests(wasmPath)
})

describe('lock-service round trip', () => {
  it('locks then unlocks with the same password, preserving page count', async () => {
    const original = await makeSamplePdf(3)
    const beforeCount = await getPageCount(original)

    const locked = await lockPdf(original, 'pw123')
    expect(locked.length).toBeGreaterThan(0)
    // The encrypted bytes differ from the plaintext.
    expect(locked).not.toEqual(original)

    const unlocked = await unlockPdf(locked, 'pw123')
    expect(await getPageCount(unlocked)).toBe(beforeCount)
  }, 30000)

  it('throws on a wrong password', async () => {
    const original = await makeSamplePdf(1)
    const locked = await lockPdf(original, 'correct')
    await expect(unlockPdf(locked, 'wrong')).rejects.toThrow(/wrong password/i)
  }, 30000)
})

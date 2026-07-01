// Client-side PDF password lock (encrypt) / unlock (decrypt) via qpdf compiled
// to WebAssembly. Everything runs in the browser — bytes never leave the page.
//
// The wasm module is loaded lazily once (module-level promise) and reused for
// every operation. Each call writes the input to the Emscripten in-memory FS,
// runs qpdf's CLI via callMain, reads the output back, and cleans up the FS
// files so repeated operations don't leak.
//
// NOTE: @neslinesli93/qpdf-wasm ships an incomplete .d.ts (it omits
// FS.writeFile / FS.unlink, which the underlying Emscripten FS does provide).
// We declare the shape we actually use here.

// Vite: import the .wasm as a URL and hand it to Emscripten's locateFile so the
// asset is resolved by the bundler (works in dev server AND production build).
import createModule from '@neslinesli93/qpdf-wasm'
// Vite `?url` import — resolves to the emitted asset URL (typed via vite/client).
import wasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'

interface QpdfFS {
  writeFile: (path: string, data: Uint8Array) => void
  readFile: (path: string) => Uint8Array
  unlink: (path: string) => void
}

interface QpdfInstance {
  // Returns the process exit code (0 = success). qpdf exits non-zero on
  // wrong password / bad input.
  callMain: (args: string[]) => number
  FS: QpdfFS
}

type QpdfFactory = (opts: { locateFile: () => string }) => Promise<QpdfInstance>

let modulePromise: Promise<QpdfInstance> | null = null

// Test seam: the `?url` import resolves to a browser/dev-server asset URL, which
// is correct at runtime but not a valid filesystem path under vitest's Node
// environment. Tests set this to the real .wasm path so the same code path can
// run the live module. In the browser this stays null and `wasmUrl` is used.
let wasmPathOverride: string | null = null
export function __setWasmPathForTests(path: string | null): void {
  wasmPathOverride = path
  modulePromise = null
}

function getModule(): Promise<QpdfInstance> {
  if (!modulePromise) {
    const factory = createModule as unknown as QpdfFactory
    modulePromise = factory({ locateFile: () => wasmPathOverride ?? (wasmUrl as string) })
  }
  return modulePromise
}

// A fresh path per operation avoids any residual-state collision between runs.
let counter = 0

async function runQpdf(
  bytes: Uint8Array,
  buildArgs: (inPath: string, outPath: string) => string[],
  errorMessage: string,
): Promise<Uint8Array> {
  const qpdf = await getModule()
  const id = counter++
  const inPath = `/in-${id}.pdf`
  const outPath = `/out-${id}.pdf`

  qpdf.FS.writeFile(inPath, bytes)
  try {
    let code: number
    try {
      code = qpdf.callMain(buildArgs(inPath, outPath))
    } catch {
      // Emscripten throws an ExitStatus for non-zero exits when noExitRuntime
      // isn't set; treat any throw as a failure.
      code = 1
    }
    if (code !== 0) {
      throw new Error(errorMessage)
    }
    let out: Uint8Array
    try {
      out = qpdf.FS.readFile(outPath)
    } catch {
      throw new Error(errorMessage)
    }
    if (!out || out.length === 0) {
      throw new Error(errorMessage)
    }
    // Return a standalone copy detached from the wasm heap.
    return out.slice()
  } finally {
    try { qpdf.FS.unlink(inPath) } catch { /* already gone */ }
    try { qpdf.FS.unlink(outPath) } catch { /* not created on failure */ }
  }
}

/**
 * Encrypt a PDF with 256-bit AES. The same password is used for both the user
 * (open) and owner (permissions) password. Returns the encrypted bytes.
 */
export function lockPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  return runQpdf(
    bytes,
    (inPath, outPath) => [inPath, '--encrypt', password, password, '256', '--', outPath],
    'Could not lock the PDF.',
  )
}

/**
 * Decrypt a password-protected PDF. Throws with a "Wrong password" message when
 * the password is incorrect or the file cannot be opened.
 */
export function unlockPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  return runQpdf(
    bytes,
    (inPath, outPath) => [`--password=${password}`, '--decrypt', inPath, outPath],
    'Wrong password.',
  )
}

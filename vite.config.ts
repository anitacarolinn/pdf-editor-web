import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @neslinesli93/qpdf-wasm is a UMD Emscripten module (module.exports = ...).
  // It MUST be pre-bundled by esbuild so Vite can synthesize the ESM `default`
  // export our service imports (excluding it breaks the default import in the
  // dev server). esbuild stubs the module's Node builtins (fs/path/crypto),
  // which are only touched in its dead Node branch in the browser. The .wasm is
  // imported with `?url` and fed to locateFile, so Vite emits it as an asset in
  // both dev and production builds.
  optimizeDeps: {
    include: ['@neslinesli93/qpdf-wasm'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

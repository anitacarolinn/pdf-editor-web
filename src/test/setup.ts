import '@testing-library/jest-dom/vitest'

// Polyfill ResizeObserver for jsdom (used in App for overlay alignment).
// jsdom never lays out, so report a fixed non-zero size on observe() — this
// lets size-gated layers (e.g. OverlayLayer, which only mounts once the canvas
// wrapper has measured width/height) actually render in tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    private cb: ResizeObserverCallback
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb
    }
    observe(target: Element) {
      const contentRect = { width: 600, height: 800, top: 0, left: 0, right: 600, bottom: 800, x: 0, y: 0 } as DOMRectReadOnly
      this.cb([{ target, contentRect } as ResizeObserverEntry], this)
    }
    unobserve() {}
    disconnect() {}
  }
}

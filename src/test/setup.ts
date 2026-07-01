import '@testing-library/jest-dom/vitest'

// Polyfill ResizeObserver for jsdom (used in App for overlay alignment)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

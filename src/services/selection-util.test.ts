import { describe, it, expect } from 'vitest'
import { clientRectsToPct } from './selection-util'

describe('clientRectsToPct', () => {
  const wrapper = { left: 100, top: 50, width: 400, height: 800 }

  it('maps a client rect into page percentages', () => {
    const out = clientRectsToPct(
      [{ left: 140, top: 90, width: 80, height: 16 }], wrapper,
    )
    expect(out).toEqual([{ xPct: 0.1, yPct: 0.05, wPct: 0.2, hPct: 0.02 }])
  })

  it('drops zero-area rects', () => {
    const out = clientRectsToPct(
      [{ left: 140, top: 90, width: 0, height: 16 },
       { left: 140, top: 90, width: 80, height: 16 }], wrapper,
    )
    expect(out).toHaveLength(1)
  })

  it('returns empty for empty input', () => {
    expect(clientRectsToPct([], wrapper)).toEqual([])
  })
})

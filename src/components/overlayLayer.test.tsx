import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import OverlayLayer from './OverlayLayer'
import { useOverlayStore } from '../services/overlay-store'

beforeEach(() => useOverlayStore.getState().clear())

describe('OverlayLayer', () => {
  it('renders one object box per object on the page', () => {
    useOverlayStore.getState().addText(0)
    useOverlayStore.getState().addText(0)
    useOverlayStore.getState().addText(1)
    render(<OverlayLayer page={0} pageWidthPx={600} pageHeightPx={800} />)
    expect(screen.getAllByTestId('overlay-text')).toHaveLength(2)
  })

  it('stacks above the pdf.js text layer so objects stay interactive', () => {
    // The .textLayer container is z-index:1 and MarkupLayer is z-index:2.
    // If the overlay layer is not lifted above them, the transparent text
    // layer sits on top of images/text and swallows drag/resize/click events.
    useOverlayStore.getState().addText(0)
    render(<OverlayLayer page={0} pageWidthPx={600} pageHeightPx={800} />)
    const layer = screen.getByTestId('overlay-layer')
    expect(Number(layer.style.zIndex)).toBeGreaterThan(2)
  })
})

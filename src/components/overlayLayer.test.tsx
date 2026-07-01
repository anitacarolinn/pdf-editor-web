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
})

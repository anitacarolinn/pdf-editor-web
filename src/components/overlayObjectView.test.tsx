import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OverlayObjectView from './OverlayObjectView'
import type { OverlayObject } from '../services/overlay-store'

const textObj: OverlayObject = { id: 'o1', page: 0, type: 'text', xPct: 0.1, yPct: 0.1, wPct: 0.4, hPct: 0.1, text: 'Hi', fontSizePct: 0.03, color: '#000000' }

describe('OverlayObjectView', () => {
  it('renders text content and fires onChange on edit', async () => {
    const onChange = vi.fn()
    render(<OverlayObjectView obj={textObj} pageWidthPx={600} pageHeightPx={800} selected onSelect={() => {}} onChange={onChange} onDelete={() => {}} />)
    const box = screen.getByTestId('overlay-text')
    expect(box).toHaveTextContent('Hi')
    await userEvent.type(box, '!')
    expect(onChange).toHaveBeenCalled()
  })

  it('fires onDelete when the delete button is clicked', async () => {
    const onDelete = vi.fn()
    render(<OverlayObjectView obj={textObj} pageWidthPx={600} pageHeightPx={800} selected onSelect={() => {}} onChange={() => {}} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete object' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('shows four corner resize grips only when selected', () => {
    const { rerender } = render(
      <OverlayObjectView obj={textObj} pageWidthPx={600} pageHeightPx={800} selected={false} onSelect={() => {}} onChange={() => {}} onDelete={() => {}} />,
    )
    expect(screen.queryAllByTestId('resize-grip')).toHaveLength(0)
    rerender(
      <OverlayObjectView obj={textObj} pageWidthPx={600} pageHeightPx={800} selected onSelect={() => {}} onChange={() => {}} onDelete={() => {}} />,
    )
    expect(screen.getAllByTestId('resize-grip')).toHaveLength(4)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SelectionPopup from './SelectionPopup'
import { I18nProvider } from '../services/i18n'

const setup = (over: Partial<React.ComponentProps<typeof SelectionPopup>> = {}) => {
  const props = {
    pos: { x: 10, y: 20 },
    selectedText: 'hello',
    onCopy: vi.fn(),
    onMark: vi.fn(),
    onSearch: vi.fn(),
    onDismiss: vi.fn(),
    ...over,
  }
  render(<I18nProvider><SelectionPopup {...props} /></I18nProvider>)
  return props
}

describe('SelectionPopup', () => {
  it('renders nothing without a selection', () => {
    const { container } = render(
      <I18nProvider><SelectionPopup pos={null} selectedText="" onCopy={() => {}}
        onMark={() => {}} onSearch={() => {}} onDismiss={() => {}} /></I18nProvider>,
    )
    expect(container.querySelector('[data-testid="selection-popup"]')).toBeNull()
  })

  it('Copy button fires onCopy', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Copy'))
    expect(p.onCopy).toHaveBeenCalledOnce()
  })

  it('Highlight applies default yellow', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Highlight'))
    expect(p.onMark).toHaveBeenCalledWith('highlight', '#ffd54a')
  })

  it('Underline and Strikethrough fire with their type', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Underline'))
    fireEvent.click(screen.getByLabelText('Strikethrough'))
    expect(p.onMark).toHaveBeenCalledWith('underline', '#000000')
    expect(p.onMark).toHaveBeenCalledWith('strikethrough', '#000000')
  })

  it('Search this text fires onSearch', () => {
    const p = setup()
    fireEvent.click(screen.getByLabelText('Search this text'))
    expect(p.onSearch).toHaveBeenCalledOnce()
  })
})

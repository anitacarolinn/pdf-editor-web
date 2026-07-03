import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from './SearchBar'
import { I18nProvider } from '../services/i18n'

const setup = (over = {}) => {
  const props = {
    query: 'fox', totalMatches: 3, currentIndex: 0,
    onQueryChange: vi.fn(), onPrev: vi.fn(), onNext: vi.fn(), onClose: vi.fn(),
    ...over,
  }
  render(<I18nProvider><SearchBar {...props} /></I18nProvider>)
  return props
}

describe('SearchBar', () => {
  it('shows the match count', () => {
    setup()
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })

  it('shows "No matches" when query has no hits', () => {
    setup({ totalMatches: 0, currentIndex: -1 })
    expect(screen.getByText('No matches')).toBeTruthy()
  })

  it('typing fires onQueryChange', () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText('Find in document'), { target: { value: 'cat' } })
    expect(p.onQueryChange).toHaveBeenCalledWith('cat')
  })

  it('Enter → next, Escape → close', () => {
    const p = setup()
    const input = screen.getByLabelText('Find in document')
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(p.onNext).toHaveBeenCalledOnce()
    expect(p.onClose).toHaveBeenCalledOnce()
  })
})

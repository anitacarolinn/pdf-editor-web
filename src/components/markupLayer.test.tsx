import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MarkupLayer from './MarkupLayer'
import { useMarkupStore } from '../services/markup-store'
import { I18nProvider } from '../services/i18n'

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>)

describe('MarkupLayer', () => {
  beforeEach(() => useMarkupStore.setState({ objects: [] }))

  it('renders one element per markup rect on the page', () => {
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
      { xPct: 0.1, yPct: 0.24, wPct: 0.4, hPct: 0.02 },
    ])
    renderWithI18n(<MarkupLayer page={0} />)
    expect(screen.getAllByTestId('markup-rect')).toHaveLength(2)
  })

  it('does not render markup from other pages', () => {
    useMarkupStore.getState().addMarkup(1, 'highlight', '#ffd54a', [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
    ])
    renderWithI18n(<MarkupLayer page={0} />)
    expect(screen.queryByTestId('markup-rect')).toBeNull()
  })

  it('clicking a markup then delete removes it', () => {
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', [
      { xPct: 0.1, yPct: 0.2, wPct: 0.3, hPct: 0.02 },
    ])
    renderWithI18n(<MarkupLayer page={0} />)
    fireEvent.click(screen.getAllByTestId('markup-rect')[0])
    fireEvent.click(screen.getByLabelText('Delete markup'))
    expect(useMarkupStore.getState().objects).toHaveLength(0)
  })
})

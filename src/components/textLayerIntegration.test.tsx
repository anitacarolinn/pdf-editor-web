import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PageEditModal from './PageEditModal'
import { I18nProvider } from '../services/i18n'
import { useMarkupStore } from '../services/markup-store'

// Mock render-service (canvas) and text-service (layer/search/extract) so no pdf.js loads.
vi.mock('../services/render-service', () => ({
  renderPageToCanvas: () => ({ cancel() {}, done: Promise.resolve() }),
}))
const extractSpy = vi.fn().mockResolvedValue('page one text\n\npage two text')
vi.mock('../services/text-service', () => ({
  renderTextLayer: () => ({ cancel() {}, done: Promise.resolve() }),
  searchDocument: vi.fn().mockResolvedValue([{ pageIndex: 0, itemIndex: 0, start: 0, length: 3 }]),
  extractDocumentText: (...a: unknown[]) => extractSpy(...a),
}))
const downloadTextSpy = vi.fn()
vi.mock('../services/file-io', () => ({ downloadText: (...a: unknown[]) => downloadTextSpy(...a) }))

const fakeDoc = { numPages: 2, getPage: async () => ({ getViewport: () => ({ width: 300, height: 400 }) }) }

function renderModal() {
  const noop = () => {}
  return render(
    <I18nProvider>
      <PageEditModal
        page={0} pageCount={2} doc={fakeDoc as never} zoom={1}
        onZoom={noop} onGo={noop} onClose={noop} onAddText={noop} onAddPicture={noop}
        onSign={noop} onApply={noop} onUndo={noop} onRedo={noop} canUndo={false} canRedo={false}
        onInsert={noop} onDeletePage={noop} onDuplicate={noop} onRotateL={noop} onRotateR={noop}
        onMoveBefore={noop} onMoveAfter={noop}
      />
    </I18nProvider>,
  )
}

describe('PageEditModal — text layer integration', () => {
  beforeEach(() => { useMarkupStore.setState({ objects: [] }); extractSpy.mockClear(); downloadTextSpy.mockClear() })

  it('renders a text layer container and a markup layer', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByTestId('text-layer')).toBeTruthy())
    expect(screen.getByTestId('markup-layer')).toBeTruthy()
  })

  it('Extract text downloads a .txt of the whole document', async () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Extract text'))
    await waitFor(() => expect(downloadTextSpy).toHaveBeenCalledOnce())
    expect(downloadTextSpy.mock.calls[0][0]).toContain('page one text')
    expect(downloadTextSpy.mock.calls[0][1]).toMatch(/\.txt$/)
  })

  it('opening search shows the search bar', async () => {
    renderModal()
    fireEvent.click(screen.getByLabelText('Search'))
    expect(screen.getByTestId('search-bar')).toBeTruthy()
  })

  it('cancelling restores the markup snapshot taken on mount', async () => {
    // markup added after mount is discarded on Cancel (mirrors overlay behavior)
    renderModal()
    useMarkupStore.getState().addMarkup(0, 'highlight', '#ffd54a', [{ xPct: 0.1, yPct: 0.1, wPct: 0.2, hPct: 0.02 }])
    fireEvent.click(screen.getByLabelText('Cancel'))
    expect(useMarkupStore.getState().objects).toHaveLength(0)
  })
})

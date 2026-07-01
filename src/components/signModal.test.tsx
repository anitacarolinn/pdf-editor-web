import { it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 1 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

// react-signature-canvas uses canvas.getContext which is not available in jsdom.
// Mock the entire module with a minimal stub that renders a plain canvas element.
vi.mock('react-signature-canvas', () => {
  const React = require('react')
  const FakeSignatureCanvas = React.forwardRef(
    (_props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        isEmpty: () => true,
        clear: () => {},
        getTrimmedCanvas: () => ({ toDataURL: () => 'data:image/png;base64,AA==' }),
      }))
      return React.createElement('canvas', {
        'data-testid': 'signature-canvas-stub',
        width: 428,
        height: 180,
      })
    },
  )
  FakeSignatureCanvas.displayName = 'SignatureCanvas'
  return { default: FakeSignatureCanvas }
})

beforeEach(async () => {
  const bytes = await makeSamplePdf(1)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

it('Sign button opens the signature modal', async () => {
  render(<App />)
  // Open the page preview modal first (Sign is now in the modal header)
  const previewBtn = await screen.findByRole('button', { name: 'Preview page' })
  await userEvent.click(previewBtn)
  // Now find and click the Sign button in the modal header
  const signBtn = await screen.findByRole('button', { name: 'Sign' })
  expect(signBtn).not.toBeDisabled()
  await userEvent.click(signBtn)
  // The modal heading should appear
  expect(await screen.findByText('Draw your signature')).toBeInTheDocument()
  // Add signature button should be disabled while pad is empty (stub returns isEmpty=true)
  const addBtn = screen.getByRole('button', { name: 'Add signature' })
  expect(addBtn).toBeDisabled()
})

it('Sign modal can be cancelled', async () => {
  render(<App />)
  // Open the page preview modal first (Sign is now in the modal header)
  const previewBtn = await screen.findByRole('button', { name: 'Preview page' })
  await userEvent.click(previewBtn)
  // Now find and click the Sign button in the modal header
  const signBtn = await screen.findByRole('button', { name: 'Sign' })
  await userEvent.click(signBtn)
  expect(await screen.findByText('Draw your signature')).toBeInTheDocument()
  // The signature modal has its own Cancel button — it renders first in the DOM
  const cancelBtns = screen.getAllByRole('button', { name: 'Cancel' })
  await userEvent.click(cancelBtns[0])
  // Signature modal should be gone
  expect(screen.queryByText('Draw your signature')).not.toBeInTheDocument()
})

import { it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useDocumentStore } from '../services/document-store'
import { makeSamplePdf } from '../test/fixtures'
import * as pageOps from '../services/page-ops'

vi.mock('../services/render-service', () => ({
  loadRenderDoc: vi.fn(async () => ({ numPages: 2 })),
  renderPageToCanvas: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve() })),
  scaleForWidth: (v: number, t: number) => t / v,
}))

beforeEach(async () => {
  const bytes = await makeSamplePdf(2)
  useDocumentStore.setState({ bytes, fileName: 'a.pdf', past: [], future: [] })
})

it('disables ops while an operation is in flight', async () => {
  // Slow down rotatePages so busy stays true long enough to observe
  const originalBytes = useDocumentStore.getState().bytes!
  let resolveRotate!: () => void
  const slowRotate = vi.spyOn(pageOps, 'rotatePages').mockImplementation(
    (_bytes, _pages, _angle) =>
      new Promise<Uint8Array>((resolve) => {
        resolveRotate = () => resolve(originalBytes)
      }),
  )

  render(<App />)
  const toolbar = await screen.findByRole('banner')
  const rotate = await screen.findByRole('button', { name: 'Rotate R' })
  const open = await screen.findByRole('button', { name: 'Open PDF' })

  // Initially not busy
  expect(toolbar).not.toHaveAttribute('aria-busy', 'true')

  // Trigger a slow operation
  await userEvent.click(rotate)

  // aria-busy should be true while op is in flight
  await waitFor(() => expect(toolbar).toHaveAttribute('aria-busy', 'true'))

  // Open PDF button stays enabled while busy
  expect(open).not.toBeDisabled()

  // Rotate R button should be disabled while busy
  expect(rotate).toBeDisabled()

  // Resolve the slow operation
  resolveRotate()

  // aria-busy should clear after op settles
  await waitFor(() => expect(toolbar).not.toHaveAttribute('aria-busy', 'true'))
  expect(rotate).not.toBeDisabled()

  slowRotate.mockRestore()
})

it('busy resets even if operation throws', async () => {
  const throwingRotate = vi.spyOn(pageOps, 'rotatePages').mockRejectedValue(
    new Error('simulated failure'),
  )

  render(<App />)
  const toolbar = await screen.findByRole('banner')
  const rotate = await screen.findByRole('button', { name: 'Rotate R' })

  await userEvent.click(rotate)

  // aria-busy should clear after error settles (finally block resets busy)
  await waitFor(() => expect(toolbar).not.toHaveAttribute('aria-busy', 'true'))
  expect(rotate).not.toBeDisabled()

  throwingRotate.mockRestore()
})

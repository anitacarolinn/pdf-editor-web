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
  let resolveDup!: () => void
  const slowDup = vi.spyOn(pageOps, 'duplicatePages').mockImplementation(
    (_bytes, _pages) =>
      new Promise<Uint8Array>((resolve) => {
        resolveDup = () => resolve(originalBytes)
      }),
  )

  render(<App />)
  const toolbar = await screen.findByRole('banner')
  const dup = await screen.findByRole('button', { name: 'Duplicate' })
  const open = await screen.findByRole('button', { name: 'Open' })

  // Initially not busy
  expect(toolbar).not.toHaveAttribute('aria-busy', 'true')

  // Trigger a slow operation
  await userEvent.click(dup)

  // aria-busy should be true while op is in flight
  await waitFor(() => expect(toolbar).toHaveAttribute('aria-busy', 'true'))

  // Open PDF button stays enabled while busy
  expect(open).not.toBeDisabled()

  // Duplicate button should be disabled while busy
  expect(dup).toBeDisabled()

  // Resolve the slow operation
  resolveDup()

  // aria-busy should clear after op settles
  await waitFor(() => expect(toolbar).not.toHaveAttribute('aria-busy', 'true'))
  expect(dup).not.toBeDisabled()

  slowDup.mockRestore()
})

it('busy resets even if operation throws', async () => {
  const throwingDup = vi.spyOn(pageOps, 'duplicatePages').mockRejectedValue(
    new Error('simulated failure'),
  )

  render(<App />)
  const toolbar = await screen.findByRole('banner')
  const dup = await screen.findByRole('button', { name: 'Duplicate' })

  await userEvent.click(dup)

  // aria-busy should clear after error settles (finally block resets busy)
  await waitFor(() => expect(toolbar).not.toHaveAttribute('aria-busy', 'true'))
  expect(dup).not.toBeDisabled()

  throwingDup.mockRestore()
})

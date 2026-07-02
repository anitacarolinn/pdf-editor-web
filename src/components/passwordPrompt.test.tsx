import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordPrompt from './PasswordPrompt'

describe('PasswordPrompt', () => {
  it('shows the file name so the user knows which file needs unlocking', () => {
    render(
      <PasswordPrompt fileName="secret-report.pdf" onSubmit={() => {}} onCancel={() => {}} />,
    )
    expect(screen.getByText(/secret-report\.pdf/)).toBeInTheDocument()
  })

  it('submits the typed password', async () => {
    const onSubmit = vi.fn()
    render(<PasswordPrompt fileName="a.pdf" onSubmit={onSubmit} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText('Password'), 'hunter2')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(onSubmit).toHaveBeenCalledWith('hunter2')
  })

  it('shows an inline error and keeps the modal open when told', () => {
    render(
      <PasswordPrompt
        fileName="a.pdf"
        error="Incorrect password"
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Incorrect password')
    // The password field is still there for a retry.
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('cancels', async () => {
    const onCancel = vi.fn()
    render(<PasswordPrompt fileName="a.pdf" onSubmit={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

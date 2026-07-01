import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewControls from './PreviewControls'

it('prev is disabled on first page; next advances', async () => {
  const onGo = vi.fn()
  render(<PreviewControls page={1} pageCount={3} zoom={1} onGo={onGo} onZoom={() => {}} />)
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(onGo).toHaveBeenCalledWith(2)
})

it('typing a page number jumps to it', async () => {
  const onGo = vi.fn()
  render(<PreviewControls page={1} pageCount={5} zoom={1} onGo={onGo} onZoom={() => {}} />)
  const box = screen.getByRole('spinbutton', { name: 'Current page' })
  await userEvent.clear(box)
  await userEvent.type(box, '4{Enter}')
  expect(onGo).toHaveBeenCalledWith(4)
})

it('blurring the page input commits the value', async () => {
  const onGo = vi.fn()
  render(<PreviewControls page={1} pageCount={5} zoom={1} onGo={onGo} onZoom={() => {}} />)
  const box = screen.getByRole('spinbutton', { name: 'Current page' })
  await userEvent.clear(box)
  await userEvent.type(box, '3')
  await userEvent.tab()
  expect(onGo).toHaveBeenCalledWith(3)
})

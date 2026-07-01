import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InfoModal from './InfoModal'

it('shows metadata fields', () => {
  render(
    <InfoModal
      info={{ pageCount: 3, title: 'T', author: 'A', subject: '', creator: '', producer: 'P', pageSizes: [{ width: 100, height: 200 }] }}
      onClose={() => {}}
    />,
  )
  expect(screen.getByText('T')).toBeInTheDocument()
  expect(screen.getByText(/Pages/)).toBeInTheDocument()
  expect(screen.getByText('3')).toBeInTheDocument()
})

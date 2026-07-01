import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useDocumentStore } from './services/document-store'

beforeEach(() => {
  useDocumentStore.setState({ bytes: null, fileName: null, past: [], future: [] })
})

describe('App shell', () => {
  it('shows an empty state when no document is loaded', () => {
    render(<App />)
    expect(screen.getByText('Open a PDF to get started')).toBeInTheDocument()
  })
})

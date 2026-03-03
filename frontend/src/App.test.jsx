import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./api/auth', () => ({
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}))

describe('App', () => {
  it('renders login when no token', () => {
    render(<App />)
    expect(screen.getByText(/Finance Tracker/i)).toBeInTheDocument()
  })
})

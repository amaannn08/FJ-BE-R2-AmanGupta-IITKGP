import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

vi.mock('../api/transactions', () => ({
  getTransactions: vi.fn(() => Promise.resolve([])),
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  uploadReceipt: vi.fn(),
  openReceipt: vi.fn(),
}))

describe('Dashboard', () => {
  it('renders add transaction section', async () => {
    render(<Dashboard onLogout={() => {}} />)
    expect(await screen.findByText(/Add transaction/i)).toBeInTheDocument()
  })
})

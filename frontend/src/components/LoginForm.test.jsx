import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginForm from './LoginForm'

describe('LoginForm', () => {
  it('renders login and register tabs', () => {
    render(<LoginForm onLogin={() => {}} />)
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument()
  })

  it('shows email and password fields', () => {
    render(<LoginForm onLogin={() => {}} />)
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
  })
})

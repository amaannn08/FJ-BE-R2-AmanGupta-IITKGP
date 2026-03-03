import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import Dashboard from './components/Dashboard'
import Profile from './components/Profile'
import Reports from './components/Reports'
import Budgets from './components/Budgets'
import AuthLayout from './components/AuthLayout'
import { getToken } from './api/auth'
import { DashboardDataProvider } from './context/DashboardDataContext'

function RequireAuth({ children }) {
  const location = useLocation()
  const token = getToken()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function App() {
  const hasToken = !!getToken()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route
        path="/"
        element={<Navigate to={hasToken ? '/dashboard' : '/login'} replace />}
      />

      <Route
        element={
          <RequireAuth>
            <DashboardDataProvider>
              <AuthLayout />
            </DashboardDataProvider>
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/budgets" element={<Budgets />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

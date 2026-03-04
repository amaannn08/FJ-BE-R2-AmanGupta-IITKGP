import React from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { clearToken, setToken } from '../api/auth'
import { UserProvider, useUser } from '../context/UserContext'

function AuthLayoutInner() {
  const navigate = useNavigate()
  const { loading } = useUser()

  const handleLogout = () => {
    clearToken()
    setToken(null)
    navigate('/login', { replace: true })
  }

  const linkBase =
    'rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium transition-colors'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-base font-semibold text-slate-900">Finance Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              Profile
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              Reports
            </NavLink>
            <NavLink
              to="/budgets"
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              Budgets
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 pb-12 pt-8">
        <Outlet />
      </main>
    </div>
  )
}

export default function AuthLayout() {
  return (
    <UserProvider>
      <AuthLayoutInner />
    </UserProvider>
  )
}


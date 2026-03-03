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
    'rounded-lg border border-slate-600 bg-slate-800/60 px-3.5 py-2 text-xs font-medium transition-colors'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-700/80 bg-slate-950/98 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-100">Finance Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-300 hover:border-slate-500 hover:bg-slate-700/80 hover:text-slate-100'
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
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-300 hover:border-slate-500 hover:bg-slate-700/80 hover:text-slate-100'
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
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-300 hover:border-slate-500 hover:bg-slate-700/80 hover:text-slate-100'
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
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-300 hover:border-slate-500 hover:bg-slate-700/80 hover:text-slate-100'
                }`
              }
            >
              Budgets
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-600 bg-slate-800/60 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-700/80 hover:text-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-12 pt-6">
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


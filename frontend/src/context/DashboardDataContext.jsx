import React, { createContext, useContext, useMemo, useState } from 'react'

export const DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

const DashboardDataContext = createContext(null)

export function DashboardDataProvider({ children }) {
  const [state, setState] = useState({
    transactions: null,
    categories: null,
    summaryFromApi: null,
    monthlyTrendFromApi: null,
    filters: { from: '', to: '', categoryId: '' },
    lastLoadedAt: {},
  })

  const value = useMemo(
    () => ({
      ...state,
      setDashboardData(partial) {
        setState((prev) => ({
          ...prev,
          ...partial,
          lastLoadedAt: {
            ...prev.lastLoadedAt,
            ...(partial.lastLoadedAt || {}),
          },
        }))
      },
    }),
    [state],
  )

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider')
  }
  return ctx
}


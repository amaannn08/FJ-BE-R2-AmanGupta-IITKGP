import { apiGet } from './client.js'

export async function getDashboardSummary(params) {
  return apiGet('/dashboard/summary', { params })
}

export async function getDashboardBreakdown(params) {
  return apiGet('/dashboard/breakdown', { params })
}

export async function getDashboardMonthlyTrend(params) {
  return apiGet('/dashboard/trend/monthly', { params })
}


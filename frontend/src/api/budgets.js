import { apiGet, apiPut } from './client.js'

export async function getBudgets({ month }) {
  const params = { month }
  const data = await apiGet('/budgets', { params })
  const items = data && Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : [])
  return items
}

export async function getBudgetProgress({ month }) {
  const params = { month }
  const data = await apiGet('/budgets/progress', { params })
  const items = data && Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : [])
  return items
}

export async function setBudget({ categoryId, month, amount }) {
  if (!categoryId) {
    throw new Error('Category id is required to set a budget.')
  }
  const payload = {
    month,
    amount,
  }
  return apiPut(`/budgets/${categoryId}`, payload)
}


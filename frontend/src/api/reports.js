import { apiGet } from './client.js'

export async function getIncomeVsExpenses({ from, to } = {}) {
  const params = { from, to }
  const response = await apiGet('/reports/monthly-income-expense', { params })
  const months = response?.months ?? []
  const rows = Array.isArray(months) ? months : []

  const data = rows.map((row) => {
    const period = row.month ?? row.period ?? ''
    const income = Number(row.income ?? row.totalIncome ?? 0)
    const expense = Number(row.expense ?? row.totalExpense ?? 0)
    const net = row.net != null ? Number(row.net) : income - expense
    return { period, income, expense, net }
  })

  return { data }
}


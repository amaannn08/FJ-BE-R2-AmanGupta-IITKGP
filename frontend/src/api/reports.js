import { apiGet } from './client.js'

export async function getIncomeVsExpenses({ from, to } = {}) {
  const params = {
    from,
    to,
  }

  const rows = await apiGet('/reports/monthly-income-expense', { params })
  if (!Array.isArray(rows)) {
    return { data: [] }
  }

  const data = rows.map((row) => {
    const month = row.month || row.period || ''
    const income = Number(row.income ?? row.totalIncome ?? 0)
    const expense = Number(row.expense ?? row.totalExpense ?? 0)
    return {
      period: month,
      income,
      expense,
    }
  })

  return { data }
}


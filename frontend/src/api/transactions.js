import { apiGet, apiPost, apiPut, apiDelete } from './client.js'

export async function getTransactions({ from, to, categoryId } = {}) {
  const params = {
    from,
    to,
    categoryId,
  }
  const data = await apiGet('/transactions', { params })
  return Array.isArray(data) ? data : []
}

export async function addTransaction({ categoryId, type, amount, description, transactionDate, currency_code }) {
  const payload = {
    categoryId,
    type,
    amount,
    description,
    transactionDate,
    currencyCode: currency_code,
  }
  return apiPost('/transactions', payload)
}

export async function updateTransaction(id, { categoryId, type, amount, description, transactionDate, currency_code }) {
  if (!id) {
    throw new Error('Transaction id is required.')
  }
  const payload = {
    categoryId,
    type,
    amount,
    description,
    transactionDate,
    currencyCode: currency_code,
  }
  return apiPut(`/transactions/${id}`, payload)
}

export async function deleteTransaction(id) {
  if (!id) {
    throw new Error('Transaction id is required.')
  }
  return apiDelete(`/transactions/${id}`)
}

export async function uploadReceipt() {
  throw new Error('Receipt upload is not yet supported with the backend API.')
}

export async function openReceipt() {
  throw new Error('Receipt viewing is not yet supported with the backend API.')
}


import { apiGet, apiPost, apiPut, apiDelete } from './client.js'
import { getToken } from './auth.js'

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function buildUrl(path) {
  const base = DEFAULT_BASE_URL.replace(/\/+$/, '')
  const cleanedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanedPath}`
}

export async function getTransactions({ from, to, categoryId } = {}) {
  const params = {
    from,
    to,
    categoryId,
  }
  const data = await apiGet('/transactions', { params })
  return Array.isArray(data) ? data : []
}

export async function addTransaction({ categoryId, type, amount, description, transactionDate, currencyCode } = {}) {
  const payload = {
    categoryId,
    type,
    amount,
    description,
    transactionDate,
    currencyCode: currencyCode || 'INR',
  }
  return apiPost('/transactions', payload)
}

export async function updateTransaction(id, { categoryId, type, amount, description, transactionDate, currencyCode } = {}) {
  if (!id) {
    throw new Error('Transaction id is required.')
  }
  const payload = {
    categoryId,
    type,
    amount,
    description,
    transactionDate,
    currencyCode: currencyCode || 'INR',
  }
  return apiPut(`/transactions/${id}`, payload)
}

export async function deleteTransaction(id) {
  if (!id) {
    throw new Error('Transaction id is required.')
  }
  return apiDelete(`/transactions/${id}`)
}

export async function uploadReceipt(transactionId, file) {
  if (!transactionId) {
    throw new Error('Transaction id is required to upload a receipt.')
  }
  if (!file) {
    throw new Error('A file is required to upload a receipt.')
  }
  const formData = new FormData()
  formData.append('receipt', file)
  return apiPost(`/transactions/${transactionId}/receipt`, formData)
}

export async function openReceipt(transactionId) {
  if (!transactionId) {
    throw new Error('Transaction id is required to open a receipt.')
  }

  const token = getToken()
  const url = buildUrl(`/transactions/${transactionId}/receipt`)

  const response = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Failed to open receipt (status ${response.status})`)
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  window.open(objectUrl, '_blank', 'noopener,noreferrer')
}


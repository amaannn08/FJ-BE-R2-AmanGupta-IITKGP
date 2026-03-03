import React, { useEffect, useState } from 'react'
import {
  getRecurringBills,
  addRecurringBill,
  toggleRecurringBillActive,
  deleteRecurringBill,
} from '../api/recurringBills'

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

function formatCurrency(n, currency = 'USD') {
  const code = currency || 'USD'
  const locale = code === 'INR' ? 'en-IN' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function RecurringBills() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [form, setForm] = useState({
    name: '',
    amount: '',
    billing_cycle: 'monthly',
    next_due_date: new Date().toISOString().slice(0, 10),
    category: '',
    currency_code: 'USD',
  })

  const loadBills = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const data = await getRecurringBills()
      setBills(data)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load recurring bills.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBills()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0 || !form.next_due_date) {
      setMessage({
        type: 'error',
        text: 'Name, a positive amount, and next due date are required.',
      })
      return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await addRecurringBill({
        name: form.name.trim(),
        amount,
        billing_cycle: form.billing_cycle,
        next_due_date: form.next_due_date,
        category: form.category.trim() || 'General',
        currency_code: form.currency_code || 'USD',
      })
      setMessage({ type: 'success', text: 'Recurring bill added.' })
      setForm((f) => ({
        ...f,
        name: '',
        amount: '',
        category: '',
      }))
      loadBills()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to add recurring bill.' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (id) => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await toggleRecurringBillActive(id)
      setMessage({ type: 'success', text: 'Updated bill status.' })
      loadBills()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update bill status.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recurring bill?')) return
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await deleteRecurringBill(id)
      setMessage({ type: 'success', text: 'Recurring bill deleted.' })
      loadBills()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete recurring bill.' })
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25'

  return (
    <section className="mt-6 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          EMI & recurring bills
        </h2>
      </div>

      {message.text && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/40 bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleAdd} className="mb-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Netflix, Home loan"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Entertainment, Utilities, Loans…"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-slate-500">Billing cycle</label>
              <select
                value={form.billing_cycle}
                onChange={(e) => setForm((f) => ({ ...f, billing_cycle: e.target.value }))}
                className={inputClass}
              >
                {BILLING_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-slate-500">Next due date</label>
              <input
                type="date"
                value={form.next_due_date}
                onChange={(e) => setForm((f) => ({ ...f, next_due_date: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Add bill'}
          </button>
        </div>
      </form>

      {loading && bills.length === 0 ? (
        <p className="text-sm text-slate-500">Loading recurring bills…</p>
      ) : bills.length === 0 ? (
        <p className="text-sm text-slate-500">No recurring bills yet. Add one above.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-700/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/60">
                <th className="px-3 py-2 font-medium text-slate-400">Name</th>
                <th className="px-3 py-2 font-medium text-slate-400">Category</th>
                <th className="px-3 py-2 font-medium text-slate-400 text-right">Amount</th>
                <th className="px-3 py-2 font-medium text-slate-400">Cycle</th>
                <th className="px-3 py-2 font-medium text-slate-400">Next due</th>
                <th className="px-3 py-2 font-medium text-slate-400 text-center">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-b border-slate-700/40 last:border-0">
                  <td className="px-3 py-2 text-slate-200">{b.name}</td>
                  <td className="px-3 py-2 text-slate-300">{b.category}</td>
                  <td className="px-3 py-2 text-right text-slate-200">
                    {formatCurrency(b.amount, b.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {b.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{b.next_due_date}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700/40 text-slate-400 border border-slate-600/60'
                      }`}
                    >
                      {b.is_active ? 'Active' : 'Cancelled'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(b.id)}
                        className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700/70"
                        disabled={loading}
                      >
                        {b.is_active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        className="rounded border border-rose-600/70 px-2 py-1 text-xs text-rose-300 hover:bg-rose-600/20"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}


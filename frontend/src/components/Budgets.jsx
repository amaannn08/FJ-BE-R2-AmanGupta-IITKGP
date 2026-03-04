import React, { useState, useEffect } from 'react';
import { getBudgetProgress, setBudget } from '../api/budgets';
import { getCategories } from '../api/categories';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function Budgets({ onClose }) {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const data = await getBudgetProgress({ month: form.month });
      const items = (Array.isArray(data) ? data : []).map((row) => {
        const budget = Number(row.budgetAmount ?? row.budget_amount ?? row.amount ?? 0);
        const spent = Number(row.actualExpense ?? row.actual_expense ?? row.spent ?? 0);
        const remaining = Number(row.remaining ?? row.remainingAmount ?? row.remaining_amount ?? budget - spent);
        const monthValue = row.month || form.month;
        const [yearStr, monthStr] = String(monthValue).split('-');
        const yearNum = Number(yearStr);
        const monthNum = Number(monthStr);
        return {
          id: row.categoryId ?? row.category_id ?? row.budgetId ?? row.id,
          category: row.categoryName ?? row.category_name ?? row.category ?? 'Category',
          limit: budget,
          spent,
          remaining,
          year: yearNum || new Date().getFullYear(),
          month: monthNum || new Date().getMonth() + 1,
          isCurrent: monthValue === new Date().toISOString().slice(0, 7),
          isOver: spent > budget,
        };
      });
      setProgress(items);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load budgets.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [form.month]);

  useEffect(() => {
    getCategories()
      .then((data) => {
        const onlyExpense = (Array.isArray(data) ? data : []).filter((c) => c.type === 'expense');
        setCategories(onlyExpense);
      })
      .catch(() => {
        // ignore category errors here; handled where used
      });
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const limit = parseFloat(form.amount);
    if (!form.categoryId || !Number.isFinite(limit) || limit < 0) {
      setMessage({ type: 'error', text: 'Category and a non-negative limit are required.' });
      return;
    }
    setMessage({ type: '', text: '' });
    try {
      await setBudget({
        categoryId: form.categoryId,
        month: form.month,
        amount: limit,
      });
      setMessage({ type: 'success', text: 'Budget saved.' });
      setForm((f) => ({ ...f, amount: '' }));
      fetchProgress();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save budget.' });
    }
  };

  const inputClass =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Budgets (INR)</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {message.text && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700'
              : 'border-red-500/40 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className={inputClass}
          >
            <option value="">Select expense category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Limit (INR)</label>
          <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Month</label>
          <input
            type="month"
            value={form.month}
            onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
            className={inputClass}
          />
        </div>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Save budget</button>
      </form>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : progress.length === 0 ? (
        <p className="text-sm text-slate-500">No budgets. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {progress.map((b) => {
            const pct = b.limit > 0 ? Math.max(0, Math.min(100, (b.spent / b.limit) * 100)) : 0;
            return (
              <div key={b.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{b.category}</p>
                    <p className="text-xs text-slate-500">
                      {b.year}-{String(b.month).padStart(2, '0')} {b.isCurrent && '(current)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700">
                      {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                    </p>
                    {b.isOver ? (
                      <p className="text-xs text-rose-400">Over by {formatCurrency(b.spent - b.limit)}</p>
                    ) : b.spent < 0 ? (
                      <p className="text-xs text-emerald-400">Under budget (refunds) · {formatCurrency(b.remaining)} left</p>
                    ) : (
                      <p className="text-xs text-emerald-400">{formatCurrency(b.remaining)} left</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all ${b.isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

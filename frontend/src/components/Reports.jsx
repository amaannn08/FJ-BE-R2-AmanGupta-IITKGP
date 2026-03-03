import React, { useState } from 'react';
import { getIncomeVsExpenses } from '../api/reports';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function Reports({ onClose }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleRun = async (e) => {
    e.preventDefault();
    if (!from || !to) {
      setError('Please select both From and To dates.');
      return;
    }
    if (new Date(from) > new Date(to)) {
      setError('From date must be on or before To date.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getIncomeVsExpenses({ from, to });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25';

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Income vs expenses report</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <form onSubmit={handleRun} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} required />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </form>
      {error && (
        <p className="mb-3 text-sm text-red-400">{error}</p>
      )}
      {result?.data?.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/60">
                <th className="px-3 py-2 font-medium text-slate-400">Period</th>
                <th className="px-3 py-2 font-medium text-slate-400 text-right">Income</th>
                <th className="px-3 py-2 font-medium text-slate-400 text-right">Expense</th>
                <th className="px-3 py-2 font-medium text-slate-400 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((row) => (
                <tr key={row.period} className="border-b border-slate-700/30">
                  <td className="px-3 py-2 text-slate-200">{row.period}</td>
                  <td className="px-3 py-2 text-right text-emerald-400">{formatCurrency(row.income)}</td>
                  <td className="px-3 py-2 text-right text-rose-400">{formatCurrency(row.expense)}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{formatCurrency(row.income - row.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result?.data?.length === 0 && !loading && result !== null && (
        <p className="text-sm text-slate-500">No data for the selected range.</p>
      )}
    </div>
  );
}

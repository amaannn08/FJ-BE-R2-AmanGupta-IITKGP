import React from 'react';

export default function RecentTransactionsList({
  transactions,
  filters,
  setFilters,
  categories,
  loading,
  editingId,
  editForm,
  setEditForm,
  incomeCategories,
  expenseCategories,
  inputClass,
  handleEditSubmit,
  handleEdit,
  handleDelete,
  handleUploadReceipt,
  openReceipt,
  formatCurrency,
  formatDate,
  findCategoryName,
  fetchTransactions,
}) {
  return (
    <section className="min-w-0 flex flex-col">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Recent transactions
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-0.5 block text-[11px] text-slate-500">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] text-slate-500">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] text-slate-500">Category</label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500/60 focus:outline-none min-w-[120px]"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setFilters({ from: '', to: '', categoryId: '' })}
            className="rounded-lg border border-slate-600 px-2 py-1.5 text-xs text-slate-800 hover:bg-slate-700/60 hover:text-slate-200"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={fetchTransactions}
            disabled={loading}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200 disabled:opacity-50"
            title="Refresh list"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm max-h-[60vh]">
        {transactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">No transactions yet.</p>
            <p className="mt-1 text-xs text-slate-600">
              Add one with the form or refresh to load existing data.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-700/50 overflow-y-auto">
            {transactions.map((t) => (
              <li key={t.id} className="px-4 py-3 transition-colors hover:bg-slate-700/30">
                {editingId === t.id ? (
                  <form onSubmit={handleEditSubmit} className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                        className={inputClass + ' flex-1 min-w-0'}
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                      <select
                        value={editForm.categoryId}
                        onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}
                        className={inputClass + ' flex-1 min-w-0'}
                      >
                        <option value="">Select category</option>
                        {(editForm.type === 'income' ? incomeCategories : expenseCategories).map(
                          (c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ),
                        )}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={editForm.amount}
                          onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                          className={inputClass + ' w-24'}
                        />
                        <select
                          value={editForm.currencyCode}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              currencyCode: e.target.value || 'INR',
                            }))
                          }
                          className={inputClass + ' w-24'}
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                        className={inputClass + ' w-36'}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={editForm.isRecurring}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              isRecurring: e.target.checked,
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
                        />
                        <span>Recurring</span>
                      </label>

                      {editForm.isRecurring && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Every</span>
                          <select
                            value={editForm.billingCycle}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                billingCycle: e.target.value,
                              }))
                            }
                            className={inputClass + ' w-32'}
                          >
                            <option value="monthly">Month</option>
                            <option value="yearly">Year</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Note"
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, description: e.target.value }))
                      }
                      className={inputClass}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                        aria-label="Save changes"
                        title="Save"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(null)}
                        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium ${
                        t.type === 'income'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">
                        {t.categoryName || t.category || findCategoryName(t.categoryId)}
                      </p>
                      {t.description && (
                        <p className="truncate text-xs text-slate-500">{t.description}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {formatDate(t.transactionDate || t.transaction_date || t.date)}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                      title={`Original: ${formatCurrency(
                        Number(t.amount) || 0,
                        t.currencyCode || 'INR',
                      )}`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {formatCurrency(Number(t.amount) || 0, t.currencyCode || 'INR')}
                    </p>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <div className="flex items-center gap-1">
                        <label className="inline-flex cursor-pointer items-center rounded px-1.5 py-1 text-[11px] text-slate-300 hover:bg-slate-600/60">
                          <span>Upload receipt</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files && e.target.files[0];
                              if (file) {
                                handleUploadReceipt(t.id, file);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                        {t.receipt_filename && (
                          <button
                            type="button"
                            onClick={() => openReceipt(t.id)}
                            className="rounded px-1.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-600/20"
                          >
                            View receipt
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEdit(t)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
                        aria-label="Edit transaction"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232a2.5 2.5 0 113.536 3.536L8.5 19.036 4 20l.964-4.5 10.268-10.268z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                        aria-label="Delete transaction"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}


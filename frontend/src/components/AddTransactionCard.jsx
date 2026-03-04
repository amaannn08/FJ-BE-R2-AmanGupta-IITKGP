import React from 'react';

export default function AddTransactionCard({
  form,
  setForm,
  inputClass,
  currentCategoryOptions,
  categories,
  loading,
  isAddingCategory,
  setIsAddingCategory,
  isRenamingCategory,
  setIsRenamingCategory,
  renameCategoryName,
  setRenameCategoryName,
  handleCreateCategory,
  updateCategory,
  fetchCategories,
  setMessage,
  setLoading,
  handleAddTransaction,
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Add transaction
      </h2>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleAddTransaction} className="space-y-3.5">
          <div className="grid grid-cols-[1.5fr_auto] gap-2">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-slate-500">Type</p>
              <div className="flex rounded-lg bg-slate-100 p-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: 'income' }))}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                    form.type === 'income'
                      ? 'bg-emerald-500/25 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: 'expense' }))}
                  className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                    form.type === 'expense'
                      ? 'bg-rose-500/25 text-rose-400'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Expense
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                Currency
              </label>
              <select
                value={form.currencyCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    currencyCode: e.target.value || 'INR',
                  }))
                }
                className={inputClass}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="category" className="mb-1 block text-[11px] font-medium text-slate-500">
              Category
            </label>
            <select
              id="category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select category</option>
              {currentCategoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory((prev) => !prev);
                  setIsRenamingCategory(false);
                }}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700/60 disabled:opacity-50"
              >
                <span className="text-lg leading-none">+</span>
                <span className="sr-only">Add category</span>
              </button>
              {form.categoryId && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const selected = categories.find(
                      (c) => String(c.id) === String(form.categoryId),
                    );
                    setRenameCategoryName(selected?.name || '');
                    setIsRenamingCategory((prev) => !prev);
                    setIsAddingCategory(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/60 disabled:opacity-50"
                  aria-label="Rename selected category"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232a2.5 2.5 0 113.536 3.536L8.5 19.036 4 20l.964-4.5 10.268-10.268z"
                    />
                  </svg>
                </button>
              )}
            </div>
            {isAddingCategory && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`New ${form.type} category`}
                  value={form.newCategoryName}
                  onChange={(e) => setForm((f) => ({ ...f, newCategoryName: e.target.value }))}
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={loading || !form.newCategoryName.trim()}
                  onClick={handleCreateCategory}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  aria-label="Save new category"
                >
                  <span className="text-lg leading-none">✓</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsAddingCategory(false);
                    setForm((f) => ({ ...f, newCategoryName: '' }));
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700/60 disabled:opacity-50"
                  aria-label="Cancel add category"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            )}
            {isRenamingCategory && form.categoryId && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New category name"
                  value={renameCategoryName}
                  onChange={(e) => setRenameCategoryName(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={loading || !renameCategoryName.trim()}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setMessage({ type: '', text: '' });
                      await updateCategory(form.categoryId, { name: renameCategoryName });
                      await fetchCategories();
                      setIsRenamingCategory(false);
                      setMessage({ type: 'success', text: 'Category renamed.' });
                    } catch (err) {
                      setMessage({
                        type: 'error',
                        text: err.message || 'Failed to rename category.',
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                  aria-label="Save category name"
                >
                  <span className="text-lg leading-none">✓</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsRenamingCategory(false);
                    setRenameCategoryName('');
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700/60 disabled:opacity-50"
                  aria-label="Cancel rename"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="amount" className="mb-1 block text-[11px] font-medium text-slate-500">
              Amount (negative for refunds in expense)
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date" className="mb-1 block text-[11px] font-medium text-slate-500">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-600">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isRecurring: e.target.checked,
                  }))
                }
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
              />
              <span>Make this recurring</span>
            </label>

            {form.isRecurring && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Every</span>
                <select
                  value={form.billingCycle}
                  onChange={(e) =>
                    setForm((f) => ({
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
          <div>
            <label htmlFor="description" className="mb-1 block text-[11px] font-medium text-slate-500">
              Note <span className="text-slate-600">(optional)</span>
            </label>
            <input
              id="description"
              type="text"
              placeholder="Brief note"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading || currentCategoryOptions.length === 0}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Adding…'
              : currentCategoryOptions.length === 0
              ? 'Add a category first'
              : 'Add transaction'}
          </button>
        </form>
      </div>
    </section>
  );
}


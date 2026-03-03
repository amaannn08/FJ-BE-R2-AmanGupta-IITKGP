import React, { useState, useEffect } from 'react';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '../api/transactions';
import { getCategories, createCategory, updateCategory, ensureCategoryExists } from '../api/categories';
import { getDashboardSummary, getDashboardMonthlyTrend } from '../api/dashboard';
import RecurringBills from './RecurringBills';
import { DEFAULT_CATEGORIES } from '../defaultCategories';
import { useDashboardData, DASHBOARD_CACHE_TTL_MS } from '../context/DashboardDataContext';

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n) {
  const locale = 'en-IN';
  const code = 'INR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function Dashboard() {
  const {
    transactions: cachedTransactions,
    categories: cachedCategories,
    filters: cachedFilters,
    lastLoadedAt = {},
    setDashboardData,
  } = useDashboardData();

  const [transactions, setTransactions] = useState(cachedTransactions || []);
  const [categories, setCategories] = useState(cachedCategories || []);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    type: 'expense',
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    newCategoryName: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ type: 'expense', categoryId: '', amount: '', description: '', date: '' });
  const [filters, setFilters] = useState(cachedFilters || { from: '', to: '', categoryId: '' });
  const [summaryFromApi, setSummaryFromApi] = useState(null);
  const [monthlyTrendFromApi, setMonthlyTrendFromApi] = useState(null);
  const [dashboardApiFailed, setDashboardApiFailed] = useState(false);
  const [renameCategoryName, setRenameCategoryName] = useState('');
  const [isRenamingCategory, setIsRenamingCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const normalizeTransaction = (t) => {
    const categoryId = t?.categoryId ?? t?.category_id ?? '';
    const transactionDate = t?.transactionDate ?? t?.transaction_date ?? t?.date ?? '';
    return {
      ...t,
      categoryId: categoryId != null ? String(categoryId) : '',
      transactionDate,
    };
  };

  const filtersEqual = (a, b) => {
    if (!a || !b) return false;
    return a.from === b.from && a.to === b.to && a.categoryId === b.categoryId;
  };

  const loadTransactions = async ({ ignoreCache = false, cancelRef } = {}) => {
    const params = {
      from: filters.from || undefined,
      to: filters.to || undefined,
      categoryId: filters.categoryId || undefined,
    };

    if (!ignoreCache) {
      const now = Date.now();
      const hasCachedFilters = cachedFilters && filtersEqual(cachedFilters, filters);
      const hasCachedTransactions = Array.isArray(cachedTransactions) && cachedTransactions.length > 0;
      const isFresh =
        hasCachedTransactions &&
        hasCachedFilters &&
        lastLoadedAt.transactions &&
        now - lastLoadedAt.transactions < DASHBOARD_CACHE_TTL_MS;

      if (isFresh) {
        const normalized = cachedTransactions.map(normalizeTransaction);
        if (cancelRef?.current) return;
        setTransactions(normalized);
        return;
      }
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const list = await getTransactions(params);
      if (cancelRef?.current) return;
      const normalized = Array.isArray(list) ? list.map(normalizeTransaction) : [];
      setTransactions(normalized);
      setDashboardData({
        transactions: normalized,
        filters,
        lastLoadedAt: { transactions: Date.now() },
      });
      if (normalized.length > 0) {
        setMessage({ type: 'success', text: `Loaded ${normalized.length} transaction(s).` });
      }
    } catch (err) {
      if (cancelRef?.current) return;
      setMessage({ type: 'error', text: err.message || 'Failed to load transactions.' });
    } finally {
      if (cancelRef?.current) return;
      setLoading(false);
    }
  };

  const fetchTransactions = () => {
    // Manual refreshes and post-mutation loads should bypass the cache.
    return loadTransactions({ ignoreCache: true });
  };

  const fetchCategories = async () => {
    try {
      const list = await getCategories();
      let updated = Array.isArray(list) ? [...list] : [];

      // Seed default expense categories (food, lifestyle, rent) per user if missing.
      for (const def of DEFAULT_CATEGORIES) {
        const existing = updated.find(
          (c) =>
            c.type === def.type &&
            c.name && c.name.trim().toLowerCase() === def.name,
        );
        if (!existing) {
          const created = await ensureCategoryExists({
            name: def.name,
            type: def.type,
            categories: updated,
          });
          const alreadyIn = updated.some(
            (c) => String(c.id) === String(created.id),
          );
          if (!alreadyIn) {
            updated.push(created);
          }
        }
      }

      setCategories(updated);
      setDashboardData({
        categories: updated,
        lastLoadedAt: { categories: Date.now() },
      });
    } catch (err) {
      setMessage((prev) => (prev.type ? prev : { type: 'error', text: err.message || 'Failed to load categories.' }));
    }
  };

  const refetchSummary = () => {
    const summaryParams = filters.from && filters.to ? { from: filters.from, to: filters.to } : {};
    getDashboardSummary(summaryParams)
      .then((data) => {
        if (data) {
          setSummaryFromApi({
            totalIncome: Number(data.totalIncome ?? 0),
            totalExpense: Number(data.totalExpense ?? 0),
            netSavings: Number(data.netSavings ?? 0),
          });
        }
      })
      .catch(() => setSummaryFromApi(null));
  };

  useEffect(() => {
    const now = Date.now();
    const hasFreshCategories =
      Array.isArray(cachedCategories) &&
      cachedCategories.length > 0 &&
      lastLoadedAt.categories &&
      now - lastLoadedAt.categories < DASHBOARD_CACHE_TTL_MS;

    if (hasFreshCategories) {
      setCategories(cachedCategories);
      return;
    }

    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form.categoryId) {
      setIsRenamingCategory(false);
      setRenameCategoryName('');
    }
  }, [form.categoryId]);

  useEffect(() => {
    const cancelRef = { current: false };

    loadTransactions({ cancelRef });

    return () => {
      cancelRef.current = true;
    };
  }, [filters.from, filters.to, filters.categoryId]);

  useEffect(() => {
    let cancelled = false;
    setDashboardApiFailed(false);
    const summaryParams = filters.from && filters.to ? { from: filters.from, to: filters.to } : {};
    getDashboardSummary(summaryParams)
      .then((data) => {
        if (!cancelled && data) {
          setSummaryFromApi({
            totalIncome: Number(data.totalIncome ?? 0),
            totalExpense: Number(data.totalExpense ?? 0),
            netSavings: Number(data.netSavings ?? 0),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummaryFromApi(null);
          setDashboardApiFailed(true);
        }
      });

    return () => { cancelled = true };
  }, [filters.from, filters.to]);

  useEffect(() => {
    let cancelled = false;
    getDashboardMonthlyTrend({ months: 6 })
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.points)) {
          setMonthlyTrendFromApi(
            data.points.map((p) => ({
              period: p.month || '',
              income: Number(p.income ?? 0),
              expense: Number(p.expense ?? 0),
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMonthlyTrendFromApi(null);
      });

    return () => { cancelled = true };
  }, []);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.categoryId || isNaN(amount) || !form.date) {
      setMessage({ type: 'error', text: 'Please choose a category, amount, and date.' });
      return;
    }
    if (form.type === 'income' && amount < 0) {
      setMessage({ type: 'error', text: 'Income amounts cannot be negative.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await addTransaction({
        categoryId: form.categoryId,
        type: form.type,
        amount,
        description: form.description.trim() || undefined,
        transactionDate: form.date,
      });
      setMessage({ type: 'success', text: 'Transaction added.' });
      setForm((f) => ({ ...f, amount: '', description: '', newCategoryName: '' }));
      fetchTransactions();
      refetchSummary();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to add transaction.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      type: t.type,
      categoryId: String(t.categoryId ?? t.category_id ?? ''),
      amount: String(t.amount ?? ''),
      description: t.description || '',
      date: (t.transactionDate || t.transaction_date || t.date || '').slice(0, 10),
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(editForm.amount);
    if (!editingId || !editForm.categoryId || isNaN(amount) || !editForm.date) {
      setMessage({ type: 'error', text: 'Category, amount, and date are required.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await updateTransaction(editingId, {
        categoryId: editForm.categoryId,
        type: editForm.type,
        amount,
        description: editForm.description.trim() || undefined,
        transactionDate: editForm.date,
      });
      setMessage({ type: 'success', text: 'Transaction updated.' });
      setEditingId(null);
      fetchTransactions();
      refetchSummary();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update.' });
    } finally {
      setLoading(false);
    }
  };

  const incomeCategories = categories.filter((c) => {
    const categoryType = c.type || c.category_type || c.categoryType
    return categoryType === 'income'
  });
  const expenseCategories = categories.filter((c) => {
    const categoryType = c.type || c.category_type || c.categoryType
    return categoryType === 'expense'
  });

  const currentCategoryOptions = form.type === 'income' ? incomeCategories : expenseCategories;

  const findCategoryName = (categoryId) => {
    const c = categories.find((cat) => String(cat.id) === String(categoryId));
    return c ? c.name : '';
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!form.newCategoryName.trim()) {
      setMessage({ type: 'error', text: 'Category name is required.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const created = await createCategory({
        name: form.newCategoryName.trim(),
        type: form.type,
      });
      await fetchCategories();
      const id = created?.id;
      setForm((f) => ({
        ...f,
        categoryId: id != null ? String(id) : f.categoryId,
        newCategoryName: '',
      }));
      setMessage({ type: 'success', text: 'Category created.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create category.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await deleteTransaction(id);
      setMessage({ type: 'success', text: 'Transaction deleted.' });
      if (editingId === id) setEditingId(null);
      fetchTransactions();
      refetchSummary();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete.' });
    } finally {
      setLoading(false);
    }
  };

  const totalIncomeFallback = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpenseFallback = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalIncome = summaryFromApi != null ? (summaryFromApi.totalIncome || 0) : totalIncomeFallback;
  const totalExpense = summaryFromApi != null ? (summaryFromApi.totalExpense || 0) : totalExpenseFallback;
  const balance = summaryFromApi != null ? (summaryFromApi.netSavings ?? totalIncome - totalExpense) : totalIncomeFallback - totalExpenseFallback;

  const monthlyDataFallback = (() => {
    const byMonth = {};
    transactions.forEach((t) => {
      const dateValue = t.transactionDate || t.transaction_date || t.date;
      const d = new Date(dateValue);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const n = Number(t.amount) || 0;
      if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
      if (t.type === 'income') byMonth[key].income += n;
      if (t.type === 'expense') byMonth[key].expense += n;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([period, data]) => ({ period, ...data }));
  })();
  const monthlyData = Array.isArray(monthlyTrendFromApi) && monthlyTrendFromApi.length > 0
    ? monthlyTrendFromApi
    : monthlyDataFallback;
  const maxBar = Math.max(1, ...monthlyData.flatMap((m) => [m.income, m.expense]));

  const inputClass =
    'w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25';

  return (
    <>
      {message.text && (
          <div
            role="alert"
            className={`mb-5 rounded-lg border px-4 py-2.5 text-sm ${
              message.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/40 bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

      {dashboardApiFailed && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          Summary and chart are computed from loaded transactions. Dashboard API is unavailable.
        </div>
      )}

      {/* Summary: three cards */}
      <section className="mb-6">
          <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Income</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-400">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Expense</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-rose-400">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Balance</p>
            <p className={`mt-0.5 text-base font-semibold tabular-nums ${balance >= 0 ? 'text-slate-100' : 'text-rose-400'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          </div>
      </section>

      {monthlyData.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Income vs expense by month
            </h2>
            <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: '80px' }}>
              {monthlyData.map((m) => (
                <div key={m.period} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                  <div className="flex w-full gap-0.5 items-end justify-center" style={{ height: '56px' }}>
                    <div
                      className="w-full max-w-[12px] rounded-t bg-emerald-500/80 transition-all"
                      style={{ height: `${(m.income / maxBar) * 56}px`, minHeight: m.income > 0 ? '4px' : 0 }}
                      title={`Income: ${formatCurrency(m.income)}`}
                    />
                    <div
                      className="w-full max-w-[12px] rounded-t bg-rose-500/80 transition-all"
                      style={{ height: `${(m.expense / maxBar) * 56}px`, minHeight: m.expense > 0 ? '4px' : 0 }}
                      title={`Expense: ${formatCurrency(m.expense)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{m.period}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-emerald-500/80" /> Income</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-rose-500/80" /> Expense</span>
            </div>
        </section>
      )}

      {/* Two columns within same container: form has fixed width, list takes rest */}
      <div className="grid gap-6 sm:grid-cols-[minmax(0,260px)_1fr]">
        {/* Add transaction card – fixed width on sm+ so it doesn’t stretch */}
        <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Add transaction
            </h2>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <form onSubmit={handleAddTransaction} className="space-y-3.5">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-slate-500">Type</p>
                  <div className="flex rounded-lg bg-slate-900/70 p-1 gap-0.5">
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
                  {loading ? 'Adding…' : currentCategoryOptions.length === 0 ? 'Add a category first' : 'Add transaction'}
                </button>
              </form>
            </div>
        </section>

        {/* Recent transactions – flexible width, same container */}
        <section className="min-w-0">
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
                    className="rounded-lg border border-slate-600 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-slate-500">To</label>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                    className="rounded-lg border border-slate-600 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] text-slate-500">Category</label>
                  <select
                    value={filters.categoryId}
                    onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
                    className="rounded-lg border border-slate-600 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500/60 focus:outline-none min-w-[120px]"
                  >
                    <option value="">All</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setFilters({ from: '', to: '', categoryId: '' })}
                  className="rounded-lg border border-slate-600 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
              {transactions.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-500">No transactions yet.</p>
                  <p className="mt-1 text-xs text-slate-600">Add one with the form or refresh to load existing data.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-700/50">
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
                              {(editForm.type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={editForm.amount}
                              onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                              className={inputClass + ' w-24'}
                            />
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                              className={inputClass + ' w-36'}
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Note"
                            value={editForm.description}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
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
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300">
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
                            <p className="font-medium text-slate-200">{t.categoryName || t.category || findCategoryName(t.categoryId)}</p>
                            {t.description && (
                              <p className="truncate text-xs text-slate-500">{t.description}</p>
                            )}
                            <p className="text-xs text-slate-500">{formatDate(t.transactionDate || t.transaction_date || t.date)}</p>
                          </div>
                          <p
                            className={`shrink-0 text-sm font-semibold tabular-nums ${
                              t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {t.type === 'income' ? '+' : '−'}
                            {formatCurrency(Number(t.amount) || 0)}
                          </p>
                          <div className="flex shrink-0 flex-wrap items-center gap-1">
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
      </div>

      <RecurringBills />
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, deleteAllTransactions, uploadReceipt, openReceipt } from '../api/transactions';
import { getCategories, createCategory, updateCategory, ensureCategoryExists } from '../api/categories';
import { getDashboardSummary, getDashboardMonthlyTrend } from '../api/dashboard';
import { DEFAULT_CATEGORIES } from '../defaultCategories';
import { useDashboardData, DASHBOARD_CACHE_TTL_MS } from '../context/DashboardDataContext';
import AddTransactionCard from './AddTransactionCard';
import MonthlyIncomeExpenseChart from './MonthlyIncomeExpenseChart';
import IncomeExpensePieChart from './IncomeExpensePieChart';
import RecentTransactionsList from './RecentTransactionsList';
import FinancialAdvisor from './FinancialAdvisor';

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n, currencyCode = 'INR') {
  const locale = 'en-IN';
  const code = currencyCode || 'INR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatInr(n) {
  return formatCurrency(n, 'INR');
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
    currencyCode: 'INR',
    newCategoryName: '',
    isRecurring: false,
    billingCycle: 'monthly',
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: 'expense',
    categoryId: '',
    amount: '',
    description: '',
    date: '',
    currencyCode: 'INR',
    isRecurring: false,
    billingCycle: 'monthly',
  });
  const [filters, setFilters] = useState(cachedFilters || { from: '', to: '', categoryId: '' });
  const [summaryFromApi, setSummaryFromApi] = useState(null);
  const [monthlyTrendFromApi, setMonthlyTrendFromApi] = useState(null);
  const [dashboardApiFailed, setDashboardApiFailed] = useState(false);
  const [renameCategoryName, setRenameCategoryName] = useState('');
  const [isRenamingCategory, setIsRenamingCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [uploadingReceiptId, setUploadingReceiptId] = useState(null);

  const normalizeTransaction = (t) => {
    const categoryId = t?.categoryId ?? t?.category_id ?? '';
    const transactionDate = t?.transactionDate ?? t?.transaction_date ?? t?.date ?? '';
    const currencyCode = t?.currencyCode ?? t?.currency_code ?? 'INR';
    return {
      ...t,
      categoryId: categoryId != null ? String(categoryId) : '',
      transactionDate,
      currencyCode,
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

  const handleUploadReceipt = async (transactionId, file) => {
    if (!transactionId || !file) return;
    setUploadingReceiptId(transactionId);
    setMessage({ type: '', text: '' });
    try {
      await uploadReceipt(transactionId, file);
      await fetchTransactions();
      setMessage({ type: 'success', text: 'Receipt uploaded.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload receipt.' });
    } finally {
      setUploadingReceiptId(null);
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
        currencyCode: form.currencyCode || 'INR',
        isRecurring: form.isRecurring,
        billingCycle: form.isRecurring ? form.billingCycle : undefined,
      });
      setMessage({ type: 'success', text: 'Transaction added.' });
      setForm((f) => ({
        ...f,
        amount: '',
        description: '',
        newCategoryName: '',
        isRecurring: false,
        billingCycle: 'monthly',
      }));
      fetchTransactions();
      refetchSummary();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to add transaction.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (t) => {
    if (!t) {
      setEditingId(null);
      return;
    }
    setEditingId(t.id);
    setEditForm({
      type: t.type,
      categoryId: String(t.categoryId ?? t.category_id ?? ''),
      amount: String(t.amount ?? ''),
      description: t.description || '',
      date: (t.transactionDate || t.transaction_date || t.date || '').slice(0, 10),
      currencyCode: t.currencyCode || t.currency_code || 'INR',
      isRecurring: Boolean(t.isRecurring || t.is_recurring),
      billingCycle: t.billingCycle || t.billing_cycle || 'monthly',
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
        currencyCode: editForm.currencyCode || 'INR',
        isRecurring: editForm.isRecurring,
        billingCycle: editForm.isRecurring ? editForm.billingCycle : undefined,
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

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL transactions? This action cannot be undone.')) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await deleteAllTransactions();
      setMessage({ type: 'success', text: 'All transactions deleted.' });
      setEditingId(null);
      fetchTransactions();
      refetchSummary();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete all transactions.' });
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

  const currentMonthKey = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  })();

  const monthlyDataSingle = monthlyData.filter((m) => m.period === currentMonthKey);
  const monthlyChartData = monthlyDataSingle.length > 0 ? monthlyDataSingle : monthlyData.slice(-1);
  // const maxBar = Math.max(1, ...monthlyChartData.flatMap((m) => [m.income, m.expense])); // Not needed for recharts
  // const isSingleMonthChart = monthlyChartData.length === 1; // Not needed for recharts

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25';

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

      <FinancialAdvisor />

      {/* Summary: three cards */}
      <section className="mb-6">
          <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Income (INR)</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Expense (INR)</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-rose-500">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Balance</p>
            <p className={`mt-0.5 text-base font-semibold tabular-nums ${balance >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          </div>
      </section>

      {/* Two columns within same container: form has fixed width, right side holds chart + recent list */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]">
        {/* Add transaction card – fixed width on md+ so it doesn’t stretch */}
        <AddTransactionCard
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          currentCategoryOptions={currentCategoryOptions}
          categories={categories}
          loading={loading}
          isAddingCategory={isAddingCategory}
          setIsAddingCategory={setIsAddingCategory}
          isRenamingCategory={isRenamingCategory}
          setIsRenamingCategory={setIsRenamingCategory}
          renameCategoryName={renameCategoryName}
          setRenameCategoryName={setRenameCategoryName}
          handleCreateCategory={handleCreateCategory}
          updateCategory={updateCategory}
          fetchCategories={fetchCategories}
          setMessage={setMessage}
          setLoading={setLoading}
          handleAddTransaction={handleAddTransaction}
        />

        {/* Right column: chart on top, scrollable recent transactions below */}
        <div className="min-w-0 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <MonthlyIncomeExpenseChart
              monthlyChartData={monthlyChartData}
              formatCurrency={formatCurrency}
            />
            <IncomeExpensePieChart
              income={totalIncome}
              expense={totalExpense}
              formatCurrency={formatCurrency}
            />
          </div>
          <RecentTransactionsList
            transactions={transactions}
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            loading={loading}
            editingId={editingId}
            editForm={editForm}
            setEditForm={setEditForm}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
            inputClass={inputClass}
            handleEditSubmit={handleEditSubmit}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleDeleteAll={handleDeleteAll}
            handleUploadReceipt={handleUploadReceipt}
            openReceipt={openReceipt}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            findCategoryName={findCategoryName}
            fetchTransactions={fetchTransactions}
          />
        </div>
      </div>
    </>
  );
}

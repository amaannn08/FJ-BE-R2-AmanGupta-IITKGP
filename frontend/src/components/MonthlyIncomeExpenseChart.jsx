import React from 'react';

export default function MonthlyIncomeExpenseChart({
  monthlyChartData,
  maxBar,
  isSingleMonthChart,
  formatCurrency,
}) {
  if (!monthlyChartData || monthlyChartData.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Income vs expense by month
      </h2>
      <div
        className={`flex items-end pb-2 ${
          isSingleMonthChart ? 'justify-center gap-4' : 'gap-1 overflow-x-auto'
        }`}
        style={{ minHeight: '80px' }}
      >
        {monthlyChartData.map((m) => (
          <div
            key={m.period}
            className={`flex flex-col items-center gap-0.5 ${
              isSingleMonthChart ? 'w-20' : 'flex-1 min-w-0'
            }`}
          >
            <div
              className={`flex items-end justify-center gap-0.5 ${
                isSingleMonthChart ? 'w-14' : 'w-full'
              }`}
              style={{ height: '56px' }}
            >
              <div
                className="w-full max-w-[12px] rounded-t bg-emerald-500/80 transition-all"
                style={{
                  height: `${(m.income / maxBar) * 56}px`,
                  minHeight: m.income > 0 ? '4px' : 0,
                }}
                title={`Income: ${formatCurrency(m.income)}`}
              />
              <div
                className="w-full max-w-[12px] rounded-t bg-rose-500/80 transition-all"
                style={{
                  height: `${(m.expense / maxBar) * 56}px`,
                  minHeight: m.expense > 0 ? '4px' : 0,
                }}
                title={`Expense: ${formatCurrency(m.expense)}`}
              />
            </div>
            <span className="text-[10px] text-slate-500">{m.period}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded bg-emerald-500/80" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded bg-rose-500/80" /> Expense
        </span>
      </div>
    </section>
  );
}


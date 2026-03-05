import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function MonthlyIncomeExpenseChart({
  monthlyChartData,
  formatCurrency,
}) {
  if (!monthlyChartData || monthlyChartData.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm flex flex-col items-center justify-center h-full min-h-[300px]">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-full text-left">
          Income vs expense by month
        </h2>
        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
          <span>No Data Available</span>
        </div>
      </section>
    );
  }

  // Ensure data is sorted by date
  const sortedData = [...monthlyChartData].sort((a, b) => 
    new Date(a.period).getTime() - new Date(b.period).getTime()
  );

  // Format date for X-axis (e.g., 'Mar')
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    const date = new Date(tickItem + '-01'); // Append day to make it parseable if it's YYYY-MM
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  // Compact currency formatter for Y-axis (e.g., 12k)
  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value;
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm flex flex-col h-full min-h-[300px]">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Income vs expense by month
      </h2>
      <div className="w-full h-64 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            margin={{
              top: 5,
              right: 10,
              left: -20,
              bottom: 0,
            }}
            barCategoryGap="20%"
          >
            {/* No X-axis labels requested */}
            <XAxis 
              dataKey="period" 
              tickFormatter={formatXAxis} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }} 
              interval={0}
            />
            <YAxis 
              tickFormatter={formatYAxis} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(value), undefined]}
              labelFormatter={(label) => {
                 if (!label) return '';
                 const date = new Date(label + '-01');
                 return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Legend 
              verticalAlign="top" 
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />
            <Bar 
              dataKey="income" 
              name="Income" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={40}
            />
            <Bar 
              dataKey="expense" 
              name="Expense" 
              fill="#f43f5e" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

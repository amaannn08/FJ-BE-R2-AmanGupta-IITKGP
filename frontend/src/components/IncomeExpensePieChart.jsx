import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function IncomeExpensePieChart({
  income,
  expense,
  formatCurrency,
}) {
  const savings = Math.max(0, income - expense);
  const data = [
    { name: 'Expense', value: expense, color: '#f43f5e' }, // rose-500
    { name: 'Savings', value: savings, color: '#10b981' }, // emerald-500
  ].filter(item => item.value > 0);

  if (income === 0 && expense === 0) {
    return null;
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm flex flex-col items-center justify-center h-full">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-full text-left">
        Income Allocation
      </h2>
      <div className="w-full h-64 flex items-center justify-center">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-slate-400 text-sm">No data to display</div>
        )}
      </div>
    </section>
  );
}

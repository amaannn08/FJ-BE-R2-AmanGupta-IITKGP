let mockBills = [
  {
    id: 1,
    name: 'Netflix',
    amount: 15.99,
    currency_code: 'INR',
    billing_cycle: 'monthly',
    next_due_date: new Date().toISOString().slice(0, 10),
    category: 'Entertainment',
    is_active: true,
  },
  {
    id: 2,
    name: 'Electricity',
    amount: 60,
    currency_code: 'INR',
    billing_cycle: 'monthly',
    next_due_date: new Date().toISOString().slice(0, 10),
    category: 'Utilities',
    is_active: true,
  },
];

let nextBillId = mockBills.length + 1;

export async function getRecurringBills() {
  return mockBills.slice();
}

export async function addRecurringBill({ name, amount, billing_cycle, next_due_date, category, currency_code } = {}) {
  if (!name || !amount || !billing_cycle || !next_due_date) {
    throw new Error('Name, amount, billing cycle, and next due date are required.');
  }

  const bill = {
    id: nextBillId++,
    name: name.trim(),
    amount: Number(amount) || 0,
    currency_code: currency_code || 'INR',
    billing_cycle,
    next_due_date,
    category: (category || 'General').trim(),
    is_active: true,
  };

  mockBills = [...mockBills, bill];
  return bill;
}

export async function updateRecurringBill(id, partial) {
  let updatedBill = null;
  mockBills = mockBills.map((b) => {
    if (b.id !== id) return b;
    updatedBill = {
      ...b,
      ...partial,
      amount: partial.amount != null ? Number(partial.amount) : b.amount,
      name: partial.name != null ? String(partial.name).trim() : b.name,
      category: partial.category != null ? String(partial.category).trim() : b.category,
    };
    return updatedBill;
  });

  if (!updatedBill) {
    throw new Error('Recurring bill not found');
  }

  return updatedBill;
}

export async function setRecurringBillActive(id, isActive) {
  return updateRecurringBill(id, { is_active: !!isActive });
}

export async function toggleRecurringBillActive(id) {
  const bill = mockBills.find((b) => b.id === id);
  if (!bill) {
    throw new Error('Recurring bill not found');
  }
  return updateRecurringBill(id, { is_active: !bill.is_active });
}

export async function deleteRecurringBill(id) {
  const before = mockBills.length;
  mockBills = mockBills.filter((b) => b.id !== id);
  if (mockBills.length === before) {
    throw new Error('Recurring bill not found');
  }
  return { success: true };
}


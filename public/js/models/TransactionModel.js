/**
 * Transaction Model
 * Role: Manages transaction data, validation, local and cloud database persistence,
 * and analytics calculations (6-month trends, MoM %, category breakdowns, and AI context).
 * Seamlessly synchronizes with backend REST API when authenticated,
 * and falls back to localStorage in guest / demo mode.
 * Strictly decoupled from DOM manipulation.
 */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Gift',
  'Other'
];

const STORAGE_KEY = 'expense_tracker_transactions_v1';

export class TransactionModel {
  constructor() {
    this.authModel = null;
    this.transactions = this.loadFromStorage();
  }

  /**
   * Sets AuthModel reference to enable authenticated cloud sync.
   * @param {import('./AuthModel.js').AuthModel} authModel
   */
  setAuthModel(authModel) {
    this.authModel = authModel;
  }

  /**
   * Loads transactions from localStorage.
   * @returns {Array} Array of transactions
   */
  loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load transactions from localStorage:', e);
      return [];
    }
  }

  /**
   * Persists transactions to localStorage cache.
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.transactions));
    } catch (e) {
      console.error('Failed to save transactions to localStorage:', e);
    }
  }

  /**
   * Loads transactions from the server database when authenticated.
   * @returns {Promise<Array>}
   */
  async loadFromServer() {
    if (!this.authModel || !this.authModel.isAuthenticated()) {
      return this.transactions;
    }

    try {
      const token = this.authModel.getToken();
      const res = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.transactions)) {
          this.transactions = data.transactions;
          this.saveToStorage();
        }
      }
    } catch (err) {
      console.warn('Could not sync with server, using local transactions:', err.message);
    }

    return this.transactions;
  }

  /**
   * Returns all transactions.
   * @returns {Array}
   */
  getAll() {
    return [...this.transactions];
  }

  /**
   * Retrieves transactions for a specific month (YYYY-MM), sorted newest first.
   * @param {string} yearMonth - Format: 'YYYY-MM'
   * @returns {Array}
   */
  getByMonth(yearMonth) {
    if (!yearMonth) return [];
    return this.transactions
      .filter(t => t.date && t.date.startsWith(yearMonth))
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }

  /**
   * Computes monthly totals for Income, Expenses, and Balance.
   * @param {string} yearMonth - Format: 'YYYY-MM'
   * @returns {Object} { income, expenses, balance, count }
   */
  getSummary(yearMonth) {
    const list = this.getByMonth(yearMonth);
    let income = 0;
    let expenses = 0;

    for (const item of list) {
      const amount = Number(item.amount) || 0;
      if (item.type === 'income') {
        income += amount;
      } else if (item.type === 'expense') {
        expenses += amount;
      }
    }

    return {
      income,
      expenses,
      balance: income - expenses,
      count: list.length
    };
  }

  /**
   * Aggregates expenses by category for a specific month.
   * @param {string} yearMonth - Format: 'YYYY-MM'
   * @returns {Object} { 'Food': 1200, ... }
   */
  getExpenseByCategory(yearMonth) {
    const list = this.getByMonth(yearMonth);
    const breakdown = {};

    EXPENSE_CATEGORIES.forEach(cat => {
      breakdown[cat] = 0;
    });

    for (const item of list) {
      if (item.type === 'expense') {
        const cat = EXPENSE_CATEGORIES.includes(item.category) ? item.category : 'Other';
        breakdown[cat] = (breakdown[cat] || 0) + (Number(item.amount) || 0);
      }
    }

    return breakdown;
  }

  /**
   * Calculates monthly expenses for the last 6 months up to currentMonth.
   * @param {string} currentMonth - 'YYYY-MM'
   * @returns {Array<{ monthKey: string, label: string, expense: number, income: number }>}
   */
  getLast6MonthsTrend(currentMonth) {
    const [currYear, currMonth] = currentMonth.split('-').map(Number);
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currYear, currMonth - 1 - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const summary = this.getSummary(monthKey);
      months.push({
        monthKey,
        label,
        expense: summary.expenses,
        income: summary.income
      });
    }
    return months;
  }

  /**
   * Calculates total spend across all months.
   * @returns {number}
   */
  getAllTimeTotalSpend() {
    return this.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  /**
   * Finds the highest expense category for a given month.
   * @param {string} yearMonth
   * @returns {{ category: string, amount: number }|null}
   */
  getTopCategory(yearMonth) {
    const categories = this.getExpenseByCategory(yearMonth);
    let topCat = null;
    let max = 0;
    for (const [cat, amt] of Object.entries(categories)) {
      if (amt > max) {
        max = amt;
        topCat = cat;
      }
    }
    return topCat ? { category: topCat, amount: max } : null;
  }

  /**
   * Calculates month-over-month trend percentage.
   * @param {string} currentMonth - 'YYYY-MM'
   * @returns {{ diff: number, pct: number, isUp: boolean, hasBaseline: boolean }}
   */
  getMonthOverMonthTrend(currentMonth) {
    const [y, m] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const currentExp = this.getSummary(currentMonth).expenses;
    const prevExp = this.getSummary(prevMonth).expenses;

    if (prevExp === 0) {
      return { diff: currentExp, pct: currentExp > 0 ? 100 : 0, isUp: currentExp > 0, hasBaseline: false };
    }
    const diff = currentExp - prevExp;
    const pct = Math.round((Math.abs(diff) / prevExp) * 100);
    return { diff, pct, isUp: diff > 0, hasBaseline: true };
  }

  /**
   * Returns all transactions that have a stored receipt image.
   * @param {string} [categoryFilter='all']
   * @returns {Array}
   */
  getReceipts(categoryFilter = 'all') {
    return this.transactions
      .filter(t => Boolean(t.receiptImage))
      .filter(t => categoryFilter === 'all' || t.category.toLowerCase() === categoryFilter.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Precomputes a compact financial summary across recent months for the AI chatbot.
   * @param {string} currentMonth - Format: 'YYYY-MM'
   * @returns {Object} Compact analytical summary
   */
  getChatContext(currentMonth) {
    const date = new Date(currentMonth + '-01T00:00:00');
    const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const twoMonthsAgoDate = new Date(date.getFullYear(), date.getMonth() - 2, 1);
    const twoMonthsAgoMonth = `${twoMonthsAgoDate.getFullYear()}-${String(twoMonthsAgoDate.getMonth() + 1).padStart(2, '0')}`;

    const currentSummary = this.getSummary(currentMonth);
    const currentCategories = this.getExpenseByCategory(currentMonth);
    const prevSummary = this.getSummary(prevMonth);
    const twoMonthsAgoSummary = this.getSummary(twoMonthsAgoMonth);

    const activeExpenseCategories = {};
    for (const [cat, amt] of Object.entries(currentCategories)) {
      if (amt > 0) activeExpenseCategories[cat] = amt;
    }

    const topExpenses = this.getByMonth(currentMonth)
      .filter(t => t.type === 'expense')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
      .map(t => ({
        merchantOrNote: t.note || t.category,
        category: t.category,
        amount: Number(t.amount),
        date: t.date
      }));

    return {
      currentMonth,
      currency: 'INR (₹)',
      totals: {
        income: currentSummary.income,
        expense: currentSummary.expenses,
        balance: currentSummary.balance
      },
      categoryExpenses: activeExpenseCategories,
      monthlyComparison: [
        { month: twoMonthsAgoMonth, income: twoMonthsAgoSummary.income, expense: twoMonthsAgoSummary.expenses },
        { month: prevMonth, income: prevSummary.income, expense: prevSummary.expenses },
        { month: currentMonth, income: currentSummary.income, expense: currentSummary.expenses }
      ],
      topExpenses
    };
  }

  /**
   * Validates transaction form inputs.
   * @param {Object} data
   * @returns {Object} { isValid: boolean, errors: Object }
   */
  validate(data) {
    const errors = {};

    if (!data.type || !['income', 'expense'].includes(data.type)) {
      errors.type = 'Please select a transaction type (Income or Expense).';
    }

    const amountNum = Number(data.amount);
    if (!data.amount || isNaN(amountNum) || amountNum <= 0) {
      errors.amount = 'Amount must be a valid number greater than 0.';
    }

    const allowedCategories = data.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!data.category || !allowedCategories.includes(data.category)) {
      errors.category = 'Please choose a valid category.';
    }

    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.date = 'Please provide a valid date (YYYY-MM-DD).';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Adds a new transaction. Syncs with cloud database if authenticated.
   * @param {Object} data - { type, amount, category, date, note, receiptImage, breakdown }
   * @returns {Promise<Object>} The added transaction
   */
  async add(data) {
    const validation = this.validate(data);
    if (!validation.isValid) {
      throw new Error('Validation failed');
    }

    const cleanAmount = parseFloat(Number(data.amount).toFixed(2));
    const cleanNote = typeof data.note === 'string' ? data.note.trim() : '';

    // If authenticated, send to backend database
    if (this.authModel && this.authModel.isAuthenticated()) {
      try {
        const token = this.authModel.getToken();
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            type: data.type,
            amount: cleanAmount,
            category: data.category,
            date: data.date,
            note: cleanNote,
            receiptImage: data.receiptImage || null,
            breakdown: Array.isArray(data.breakdown) ? data.breakdown : null
          })
        });

        if (res.ok) {
          const respData = await res.json();
          const serverTx = respData.transaction;
          this.transactions.unshift(serverTx);
          this.saveToStorage();
          return serverTx;
        }
      } catch (err) {
        console.warn('Server transaction save failed, saving locally:', err.message);
      }
    }

    // Local fallback
    const newTransaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: data.type,
      amount: cleanAmount,
      category: data.category,
      date: data.date,
      note: cleanNote,
      receiptImage: data.receiptImage || null,
      breakdown: Array.isArray(data.breakdown) ? data.breakdown : null,
      createdAt: Date.now()
    };

    this.transactions.unshift(newTransaction);
    this.saveToStorage();
    return newTransaction;
  }

  /**
   * Deletes a transaction by id. Syncs with backend if authenticated.
   * @param {string} id
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    if (this.authModel && this.authModel.isAuthenticated()) {
      try {
        const token = this.authModel.getToken();
        await fetch(`/api/transactions/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Failed to delete on server:', err.message);
      }
    }

    const initialLength = this.transactions.length;
    this.transactions = this.transactions.filter(t => t.id !== id);
    if (this.transactions.length !== initialLength) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Seeds demo data across 6 months so visitors can instantly explore all charts and receipts.
   * @returns {Array} Seeded transactions
   */
  seedDemoData() {
    const d = new Date();
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth();

    function getMonthStr(offset) {
      const target = new Date(currentYear, currentMonth - offset, 1);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }

    const m0 = getMonthStr(0);
    const m1 = getMonthStr(1);
    const m2 = getMonthStr(2);
    const m3 = getMonthStr(3);
    const m4 = getMonthStr(4);
    const m5 = getMonthStr(5);

    const demoItems = [
      { id: 'demo-1', type: 'expense', amount: 3200, category: 'Food', date: `${m5}-15`, note: 'Family Dinner' },
      { id: 'demo-2', type: 'expense', amount: 1500, category: 'Transport', date: `${m5}-20`, note: 'Monthly Metro Pass' },
      { id: 'demo-3', type: 'expense', amount: 4800, category: 'Shopping', date: `${m4}-10`, note: 'Clothing & Footwear' },
      { id: 'demo-4', type: 'expense', amount: 2100, category: 'Food', date: `${m4}-25`, note: 'Grocery Supermarket' },
      { id: 'demo-5', type: 'expense', amount: 5400, category: 'Bills', date: `${m3}-05`, note: 'Electricity & Internet' },
      { id: 'demo-6', type: 'expense', amount: 3100, category: 'Entertainment', date: `${m3}-18`, note: 'Concert Tickets' },
      { id: 'demo-7', type: 'expense', amount: 4200, category: 'Food', date: `${m2}-12`, note: 'Dining Out' },
      { id: 'demo-8', type: 'expense', amount: 1800, category: 'Transport', date: `${m2}-22`, note: 'Fuel' },
      { id: 'demo-9', type: 'expense', amount: 3900, category: 'Food', date: `${m1}-08`, note: 'Cafes & Snacks' },
      { id: 'demo-10', type: 'expense', amount: 2600, category: 'Health', date: `${m1}-19`, note: 'Pharmacy & Health' },
      { id: 'demo-11', type: 'income', amount: 55000, category: 'Salary', date: `${m0}-01`, note: 'Monthly Salary' },
      { id: 'demo-12', type: 'expense', amount: 1170.75, category: 'Food', date: `${m0}-10`, note: 'SPICE GARDEN RESTAURANT' },
      { id: 'demo-13', type: 'expense', amount: 1396.50, category: 'Food', date: `${m0}-12`, note: 'SuperMart (Groceries: ₹560, Food: ₹130, Personal Care: ₹270, Household: ₹370)', breakdown: [
        { name: 'Groceries', category: 'Food', amount: 560 },
        { name: 'Food', category: 'Food', amount: 130 },
        { name: 'Personal Care', category: 'Health', amount: 270 },
        { name: 'Household', category: 'Other', amount: 370 }
      ]},
      { id: 'demo-14', type: 'expense', amount: 2450.00, category: 'Shopping', date: `${m0}-04`, note: 'Department Store' },
      { id: 'demo-15', type: 'expense', amount: 850.00, category: 'Transport', date: `${m0}-07`, note: 'Cab Rides' }
    ];

    this.transactions = demoItems;
    this.saveToStorage();
    return this.transactions;
  }

  /**
   * Returns list of allowed categories for a given type.
   * @param {string} type - 'expense' | 'income'
   * @returns {Array<string>}
   */
  getCategoriesForType(type) {
    return type === 'income' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES];
  }
}

/**
 * Transaction View
 * Role: Handles rendering and DOM events for the transaction form, month picker,
 * monthly summary cards, and the transaction list.
 * Adheres strictly to MVC: contains no business logic, persistence, or network calls.
 * Uses textContent to guard against Cross-Site Scripting (XSS).
 */

export class TransactionView {
  constructor() {
    // Month picker elements
    this.monthPicker = document.getElementById('monthPicker');
    this.prevMonthBtn = document.getElementById('prevMonthBtn');
    this.nextMonthBtn = document.getElementById('nextMonthBtn');
    this.currentMonthHeading = document.getElementById('currentMonthHeading');

    // Summary cards
    this.summaryIncome = document.getElementById('summaryIncome');
    this.summaryExpenses = document.getElementById('summaryExpenses');
    this.summaryBalance = document.getElementById('summaryBalance');

    // Form elements
    this.form = document.getElementById('txForm');
    this.typeExpenseBtn = document.getElementById('typeExpenseBtn');
    this.typeIncomeBtn = document.getElementById('typeIncomeBtn');
    this.currentTypeInput = document.getElementById('txType');
    this.amountInput = document.getElementById('txAmount');
    this.categorySelect = document.getElementById('txCategory');
    this.dateInput = document.getElementById('txDate');
    this.noteInput = document.getElementById('txNote');
    this.submitBtn = document.getElementById('txSubmitBtn');

    // Review banner
    this.reviewBanner = document.getElementById('reviewBanner');
    this.reviewMerchantText = document.getElementById('reviewMerchantText');
    this.dismissReviewBtn = document.getElementById('dismissReviewBtn');
    this.reviewBreakdownWrap = document.getElementById('reviewBreakdownWrap');
    this.reviewBreakdownChips = document.getElementById('reviewBreakdownChips');
    this.splitReceiptBtn = document.getElementById('splitReceiptBtn');

    // Error message elements
    this.amountError = document.getElementById('amountError');
    this.categoryError = document.getElementById('categoryError');
    this.dateError = document.getElementById('dateError');
    this.generalError = document.getElementById('generalError');

    // List and empty state elements
    this.txContainer = document.getElementById('transactionList');
    this.emptyState = document.getElementById('emptyState');
    this.txCountBadge = document.getElementById('txCountBadge');

    // Currency formatter (Indian Rupee)
    this.currencyFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    });
  }

  /**
   * Formats a numeric amount to INR currency string.
   * @param {number} amount
   * @returns {string} e.g. "₹1,250.00"
   */
  formatCurrency(amount) {
    return this.currencyFormatter.format(amount || 0);
  }

  /**
   * Sets the value of the month picker.
   * @param {string} yearMonth - Format 'YYYY-MM'
   */
  setMonthPickerValue(yearMonth) {
    if (this.monthPicker) {
      this.monthPicker.value = yearMonth;
    }
    if (this.currentMonthHeading) {
      const [year, month] = yearMonth.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      this.currentMonthHeading.textContent = label;
    }
  }

  /**
   * Updates the three summary cards (Income, Expenses, Balance).
   * @param {Object} summary - { income, expenses, balance, count }
   */
  renderSummary({ income, expenses, balance, count }) {
    if (this.summaryIncome) {
      this.summaryIncome.textContent = this.formatCurrency(income);
    }
    if (this.summaryExpenses) {
      this.summaryExpenses.textContent = this.formatCurrency(expenses);
    }
    if (this.summaryBalance) {
      this.summaryBalance.textContent = this.formatCurrency(balance);
      this.summaryBalance.classList.remove('balance-positive', 'balance-negative', 'balance-zero');
      if (balance > 0) {
        this.summaryBalance.classList.add('balance-positive');
      } else if (balance < 0) {
        this.summaryBalance.classList.add('balance-negative');
      } else {
        this.summaryBalance.classList.add('balance-zero');
      }
    }
    if (this.txCountBadge) {
      this.txCountBadge.textContent = `${count} transaction${count === 1 ? '' : 's'}`;
    }
  }

  /**
   * Renders the additional KPI cards (Total Spend All Time, Trend vs last month, Top Category).
   * @param {Object} stats - { totalSpendAllTime, topCategory, momTrend }
   */
  renderExtendedStats({ totalSpendAllTime, topCategory, momTrend }) {
    const elSpend = document.getElementById('statTotalSpend');
    if (elSpend) {
      elSpend.textContent = this.formatCurrency(totalSpendAllTime);
    }

    const elTrend = document.getElementById('statMonthTrend');
    if (elTrend) {
      if (!momTrend || !momTrend.hasBaseline) {
        elTrend.textContent = 'Current month baseline';
        elTrend.className = 'card-sub-trend trend-neutral';
      } else if (momTrend.isUp) {
        elTrend.textContent = `↑ ${momTrend.pct}% from last month`;
        elTrend.className = 'card-sub-trend trend-up';
      } else {
        elTrend.textContent = `↓ ${momTrend.pct}% from last month`;
        elTrend.className = 'card-sub-trend trend-down';
      }
    }

    const elTopCat = document.getElementById('statTopCategory');
    const elTopCatAmt = document.getElementById('statTopCategoryAmount');
    if (elTopCat) {
      elTopCat.textContent = topCategory ? topCategory.category : 'None yet';
    }
    if (elTopCatAmt) {
      elTopCatAmt.textContent = topCategory ? this.formatCurrency(topCategory.amount) : '₹0.00';
    }
  }

  /**
   * Populates the category dropdown options.
   * @param {Array<string>} categories
   * @param {string} [selectedCategory]
   */
  setCategories(categories, selectedCategory = '') {
    if (!this.categorySelect) return;
    this.categorySelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Category --';
    this.categorySelect.appendChild(defaultOption);

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      if (selectedCategory && cat.toLowerCase() === selectedCategory.toLowerCase()) {
        option.selected = true;
      }
      this.categorySelect.appendChild(option);
    });
  }

  /**
   * Updates the active state of transaction type buttons (expense vs income).
   * @param {string} type - 'expense' | 'income'
   */
  setType(type) {
    if (this.currentTypeInput) {
      this.currentTypeInput.value = type;
    }
    if (this.typeExpenseBtn && this.typeIncomeBtn) {
      if (type === 'income') {
        this.typeIncomeBtn.classList.add('active');
        this.typeExpenseBtn.classList.remove('active');
        this.typeIncomeBtn.setAttribute('aria-pressed', 'true');
        this.typeExpenseBtn.setAttribute('aria-pressed', 'false');
      } else {
        this.typeExpenseBtn.classList.add('active');
        this.typeIncomeBtn.classList.remove('active');
        this.typeExpenseBtn.setAttribute('aria-pressed', 'true');
        this.typeIncomeBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  /**
   * Prefills the transaction form fields (e.g. from receipt extraction).
   * @param {Object} data - { type, amount, category, date, note }
   */
  setFormData(data) {
    if (data.type) {
      this.setType(data.type);
    }
    if (data.amount !== undefined && data.amount !== null) {
      this.amountInput.value = data.amount;
    }
    if (data.category && this.categorySelect) {
      this.categorySelect.value = data.category;
    }
    if (data.date && this.dateInput) {
      this.dateInput.value = data.date;
    }
    if (data.note !== undefined && this.noteInput) {
      this.noteInput.value = data.note;
    }
  }

  /**
   * Displays the "Review and confirm" banner for scanned receipts.
   * If breakdown contains multiple sections, renders multi-category chips and split action.
   * @param {string} merchant
   * @param {string} [engineName]
   * @param {Array} [breakdown]
   */
  showReviewBanner(merchant, engineName = 'AI', breakdown = []) {
    if (this.reviewBanner) {
      this.reviewBanner.classList.remove('hidden');
      if (this.reviewMerchantText) {
        this.reviewMerchantText.textContent = merchant
          ? `Scanned receipt from "${merchant}" (${engineName}). Please review and confirm the details below.`
          : `Receipt scanned (${engineName})! Please review and confirm the details before adding.`;
      }

      // Render multi-category breakdown if multiple categories exist
      if (this.reviewBreakdownWrap && this.reviewBreakdownChips) {
        this.reviewBreakdownChips.innerHTML = '';
        if (breakdown && breakdown.length > 1) {
          breakdown.forEach(item => {
            const chip = document.createElement('span');
            chip.className = `breakdown-chip chip-${item.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            chip.textContent = `${item.name}: ${this.formatCurrency(item.amount)}`;
            this.reviewBreakdownChips.appendChild(chip);
          });
          this.reviewBreakdownWrap.classList.remove('hidden');
        } else {
          this.reviewBreakdownWrap.classList.add('hidden');
        }
      }

      this.reviewBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Hides the review banner and breakdown container.
   */
  hideReviewBanner() {
    if (this.reviewBanner) {
      this.reviewBanner.classList.add('hidden');
    }
    if (this.reviewBreakdownWrap) {
      this.reviewBreakdownWrap.classList.add('hidden');
    }
  }

  /**
   * Renders the transaction list items safely using DOM textContent.
   * @param {Array} transactions
   */
  renderTransactions(transactions) {
    if (!this.txContainer) return;
    this.txContainer.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      if (this.emptyState) {
        this.emptyState.classList.remove('hidden');
      }
      return;
    }

    if (this.emptyState) {
      this.emptyState.classList.add('hidden');
    }

    transactions.forEach(tx => {
      const itemEl = document.createElement('div');
      itemEl.className = `tx-item tx-type-${tx.type}`;

      // Left container: Icon/Badge & info
      const leftCol = document.createElement('div');
      leftCol.className = 'tx-info';

      const categoryBadge = document.createElement('span');
      categoryBadge.className = `category-badge badge-${tx.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      categoryBadge.textContent = tx.category;

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'tx-details';

      const titleEl = document.createElement('span');
      titleEl.className = 'tx-title';
      titleEl.textContent = tx.note || tx.category;

      const metaEl = document.createElement('span');
      metaEl.className = 'tx-meta';
      // Format date nicely
      const [y, m, d] = tx.date.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      metaEl.textContent = `${formattedDate} • ${tx.type === 'income' ? 'Income' : 'Expense'}`;

      detailsDiv.appendChild(titleEl);
      detailsDiv.appendChild(metaEl);

      leftCol.appendChild(categoryBadge);
      leftCol.appendChild(detailsDiv);

      // Right container: Amount & delete button
      const rightCol = document.createElement('div');
      rightCol.className = 'tx-actions';

      const amountEl = document.createElement('span');
      amountEl.className = `tx-amount ${tx.type === 'income' ? 'amount-income' : 'amount-expense'}`;
      const sign = tx.type === 'income' ? '+' : '-';
      amountEl.textContent = `${sign} ${this.formatCurrency(tx.amount)}`;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete-tx';
      deleteBtn.setAttribute('data-id', tx.id);
      deleteBtn.setAttribute('aria-label', `Delete transaction: ${tx.note || tx.category} for ${this.formatCurrency(tx.amount)}`);
      deleteBtn.title = 'Delete transaction';
      deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;

      rightCol.appendChild(amountEl);
      rightCol.appendChild(deleteBtn);

      itemEl.appendChild(leftCol);
      itemEl.appendChild(rightCol);

      this.txContainer.appendChild(itemEl);
    });
  }

  /**
   * Displays inline validation errors.
   * @param {Object} errors
   */
  showErrors(errors = {}) {
    this.clearErrors();

    if (errors.amount && this.amountError) {
      this.amountError.textContent = errors.amount;
      this.amountError.classList.remove('hidden');
      this.amountInput.classList.add('input-invalid');
    }
    if (errors.category && this.categoryError) {
      this.categoryError.textContent = errors.category;
      this.categoryError.classList.remove('hidden');
      this.categorySelect.classList.add('input-invalid');
    }
    if (errors.date && this.dateError) {
      this.dateError.textContent = errors.date;
      this.dateError.classList.remove('hidden');
      this.dateInput.classList.add('input-invalid');
    }
    if (errors.general && this.generalError) {
      this.generalError.textContent = errors.general;
      this.generalError.classList.remove('hidden');
    }
  }

  /**
   * Clears all inline error indicators.
   */
  clearErrors() {
    const errorContainers = [this.amountError, this.categoryError, this.dateError, this.generalError];
    errorContainers.forEach(el => {
      if (el) {
        el.textContent = '';
        el.classList.add('hidden');
      }
    });

    const inputs = [this.amountInput, this.categorySelect, this.dateInput];
    inputs.forEach(el => {
      if (el) el.classList.remove('input-invalid');
    });
  }

  /**
   * Resets form values to defaults.
   * @param {string} defaultDate - YYYY-MM-DD
   */
  resetForm(defaultDate) {
    if (this.amountInput) this.amountInput.value = '';
    if (this.categorySelect) this.categorySelect.value = '';
    if (this.dateInput && defaultDate) this.dateInput.value = defaultDate;
    if (this.noteInput) this.noteInput.value = '';
    this.hideReviewBanner();
    this.clearErrors();
  }

  /**
   * Binds month picker change event.
   * @param {Function} handler
   */
  bindMonthChange(handler) {
    if (this.monthPicker) {
      this.monthPicker.addEventListener('change', (e) => {
        handler(e.target.value);
      });
    }

    if (this.prevMonthBtn) {
      this.prevMonthBtn.addEventListener('click', () => {
        const currentVal = this.monthPicker.value;
        if (!currentVal) return;
        const [year, month] = currentVal.split('-').map(Number);
        const prev = new Date(year, month - 2, 1);
        const prevMonthStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        handler(prevMonthStr);
      });
    }

    if (this.nextMonthBtn) {
      this.nextMonthBtn.addEventListener('click', () => {
        const currentVal = this.monthPicker.value;
        if (!currentVal) return;
        const [year, month] = currentVal.split('-').map(Number);
        const next = new Date(year, month, 1);
        const nextMonthStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        handler(nextMonthStr);
      });
    }
  }

  /**
   * Binds expense / income toggle clicks.
   * @param {Function} handler
   */
  bindTypeToggle(handler) {
    if (this.typeExpenseBtn) {
      this.typeExpenseBtn.addEventListener('click', () => {
        this.setType('expense');
        handler('expense');
      });
    }
    if (this.typeIncomeBtn) {
      this.typeIncomeBtn.addEventListener('click', () => {
        this.setType('income');
        handler('income');
      });
    }
  }

  /**
   * Binds form submission event.
   * @param {Function} handler
   */
  bindSubmitTransaction(handler) {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          type: this.currentTypeInput ? this.currentTypeInput.value : 'expense',
          amount: this.amountInput ? this.amountInput.value.trim() : '',
          category: this.categorySelect ? this.categorySelect.value : '',
          date: this.dateInput ? this.dateInput.value : '',
          note: this.noteInput ? this.noteInput.value.trim() : ''
        };
        handler(data);
      });
    }
  }

  /**
   * Binds click on delete buttons inside the transaction list via delegation.
   * @param {Function} handler
   */
  bindDeleteTransaction(handler) {
    if (this.txContainer) {
      this.txContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete-tx');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id');
          if (id) {
            handler(id);
          }
        }
      });
    }
  }

  /**
   * Binds dismiss review banner button.
   * @param {Function} handler
   */
  bindDismissReview(handler) {
    if (this.dismissReviewBtn) {
      this.dismissReviewBtn.addEventListener('click', () => {
        this.hideReviewBanner();
        if (handler) handler();
      });
    }
  }

  /**
   * Binds the split multi-category receipt button.
   * @param {Function} handler
   */
  bindSplitReceipt(handler) {
    if (this.splitReceiptBtn) {
      this.splitReceiptBtn.addEventListener('click', () => {
        if (handler) handler();
      });
    }
  }
}

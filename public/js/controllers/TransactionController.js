/**
 * Transaction Controller
 * Role: Mediates between TransactionModel, TransactionView, and ChartView.
 * Handles month navigation, transaction creation and deletion, form validation,
 * and prefilling data from receipt reviews.
 */

export class TransactionController {
  /**
   * @param {import('../models/TransactionModel.js').TransactionModel} model
   * @param {import('../views/TransactionView.js').TransactionView} view
   * @param {import('../views/ChartView.js').ChartView} chartView
   */
  constructor(model, view, chartView) {
    this.model = model;
    this.view = view;
    this.chartView = chartView;
    this.currentMonth = this.getLocalCurrentMonth();
    this.pendingReceiptImage = null;
    this.pendingBreakdown = null;
    this.pendingReceiptData = null;
    this.receiptHistoryController = null;
  }

  /**
   * Sets reference to ReceiptHistoryController for cross-controller updates.
   * @param {import('./ReceiptHistoryController.js').ReceiptHistoryController} controller
   */
  setReceiptHistoryController(controller) {
    this.receiptHistoryController = controller;
  }

  /**
   * Returns current local date as 'YYYY-MM-DD'.
   * @returns {string}
   */
  getLocalToday() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns current local month as 'YYYY-MM'.
   * @returns {string}
   */
  getLocalCurrentMonth() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Initializes the controller and wires view listeners.
   */
  init() {
    // Set initial month
    this.view.setMonthPickerValue(this.currentMonth);

    // Initialize categories for default 'expense' type
    const categories = this.model.getCategoriesForType('expense');
    this.view.setCategories(categories);
    this.view.setType('expense');

    // Set default date in form
    this.view.resetForm(this.getLocalToday());

    // Bind event handlers from View
    this.view.bindMonthChange((newMonth) => this.handleMonthChange(newMonth));
    this.view.bindTypeToggle((type) => this.handleTypeToggle(type));
    this.view.bindSubmitTransaction((data) => this.handleSubmitTransaction(data));
    this.view.bindDeleteTransaction((id) => this.handleDeleteTransaction(id));
    this.view.bindDismissReview(() => this.handleDismissReview());
    this.view.bindSplitReceipt(() => this.handleSplitReceipt());

    // Render initial data
    this.refreshView();
  }

  /**
   * Handles user switching months.
   * @param {string} newMonth - 'YYYY-MM'
   */
  handleMonthChange(newMonth) {
    if (!newMonth) return;
    this.currentMonth = newMonth;
    this.view.setMonthPickerValue(newMonth);
    this.refreshView();
  }

  /**
   * Handles user switching between Expense and Income type.
   * @param {string} type - 'expense' | 'income'
   */
  handleTypeToggle(type) {
    const categories = this.model.getCategoriesForType(type);
    this.view.setCategories(categories);
    this.view.clearErrors();
  }

  /**
   * Handles submitting the transaction form.
   * @param {Object} data - { type, amount, category, date, note }
   */
  handleSubmitTransaction(data) {
    const validation = this.model.validate(data);
    if (!validation.isValid) {
      this.view.showErrors(validation.errors);
      return;
    }

    try {
      // Attach pending receipt image and breakdown if available
      if (this.pendingReceiptImage) {
        data.receiptImage = this.pendingReceiptImage;
        this.pendingReceiptImage = null;
      }
      if (this.pendingBreakdown) {
        data.breakdown = this.pendingBreakdown;
        this.pendingBreakdown = null;
      }
      this.pendingReceiptData = null;

      this.model.add(data);
      this.view.resetForm(this.getLocalToday());

      // If the transaction belongs to another month, switch to it so user sees it
      const txMonth = data.date.substring(0, 7);
      if (txMonth !== this.currentMonth) {
        this.currentMonth = txMonth;
        this.view.setMonthPickerValue(txMonth);
      }

      this.refreshView();

      if (this.receiptHistoryController) {
        this.receiptHistoryController.refreshView();
      }
    } catch (err) {
      this.view.showErrors({ general: 'Failed to save transaction: ' + err.message });
    }
  }

  /**
   * Handles transaction deletion.
   * @param {string} id
   */
  handleDeleteTransaction(id) {
    const success = this.model.delete(id);
    if (success) {
      this.refreshView();
      if (this.receiptHistoryController) {
        this.receiptHistoryController.refreshView();
      }
    }
  }

  /**
   * Handles dismissing review banner.
   */
  handleDismissReview() {
    this.view.hideReviewBanner();
    this.pendingReceiptImage = null;
    this.pendingBreakdown = null;
    this.pendingReceiptData = null;
  }

  /**
   * Handles splitting a multi-category receipt into individual transactions.
   */
  handleSplitReceipt() {
    if (!this.pendingBreakdown || this.pendingBreakdown.length === 0) return;

    try {
      const targetDate = this.view.dateInput?.value || this.getLocalToday();
      const merchant = this.pendingReceiptData?.merchant || 'Store';
      const receiptImg = this.pendingReceiptImage;

      // Calculate total of subtotals and distribute taxes/GST proportionally
      const subtotalSum = this.pendingBreakdown.reduce((sum, item) => sum + item.amount, 0);
      const grandTotal = Number(this.pendingReceiptData?.amount) || subtotalSum;
      const taxRatio = (grandTotal > subtotalSum && subtotalSum > 0) ? (grandTotal / subtotalSum) : 1;

      this.pendingBreakdown.forEach((item) => {
        const adjustedAmount = parseFloat((item.amount * taxRatio).toFixed(2));
        this.model.add({
          type: 'expense',
          amount: adjustedAmount,
          category: item.category,
          date: targetDate,
          note: `${merchant} - ${item.name}`,
          receiptImage: receiptImg
        });
      });

      this.view.resetForm(this.getLocalToday());
      this.pendingReceiptImage = null;
      this.pendingBreakdown = null;
      this.pendingReceiptData = null;

      // Switch month if needed
      const txMonth = targetDate.substring(0, 7);
      if (txMonth !== this.currentMonth) {
        this.currentMonth = txMonth;
        this.view.setMonthPickerValue(txMonth);
      }

      this.refreshView();
      if (this.receiptHistoryController) {
        this.receiptHistoryController.refreshView();
      }
    } catch (err) {
      this.view.showErrors({ general: 'Failed to split receipt: ' + err.message });
    }
  }

  /**
   * Prefills form with scanned receipt data and shows review banner.
   * @param {Object} receiptData - { merchant, amount, date, category, note, receiptImage, breakdown }
   * @param {string} [engineName]
   */
  prefillForReview(receiptData, engineName = 'Gemini AI') {
    this.pendingReceiptImage = receiptData.receiptImage || null;
    this.pendingBreakdown = receiptData.breakdown || null;
    this.pendingReceiptData = receiptData;

    // Receipts are always categorized as expenses
    this.view.setType('expense');
    const categories = this.model.getCategoriesForType('expense');
    this.view.setCategories(categories, receiptData.category);

    const targetDate = receiptData.date || this.getLocalToday();
    this.view.setFormData({
      type: 'expense',
      amount: receiptData.amount ? Number(receiptData.amount).toFixed(2) : '',
      category: receiptData.category || 'Food',
      date: targetDate,
      note: receiptData.note || receiptData.merchant || ''
    });

    this.view.showReviewBanner(receiptData.merchant, engineName, receiptData.breakdown);
  }

  /**
   * Refreshes summary, transaction list, and chart for current month.
   */
  refreshView() {
    const summary = this.model.getSummary(this.currentMonth);
    this.view.renderSummary(summary);

    const transactions = this.model.getByMonth(this.currentMonth);
    this.view.renderTransactions(transactions);

    const expenseByCategory = this.model.getExpenseByCategory(this.currentMonth);
    this.chartView.renderChart(expenseByCategory);

    // Render 6-month spending trend bar chart
    const trend6m = this.model.getLast6MonthsTrend(this.currentMonth);
    this.chartView.renderTrendChart(trend6m);

    // Render extended KPI statistics (Total Spend, MoM trend, Top Category)
    const totalSpendAllTime = this.model.getAllTimeTotalSpend();
    const topCategory = this.model.getTopCategory(this.currentMonth);
    const momTrend = this.model.getMonthOverMonthTrend(this.currentMonth);
    this.view.renderExtendedStats({ totalSpendAllTime, topCategory, momTrend });
  }

  /**
   * Returns current active month in controller.
   * @returns {string}
   */
  getCurrentMonth() {
    return this.currentMonth;
  }
}

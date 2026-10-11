/**
 * Receipt History Controller
 * Role: Mediates between TransactionModel and ReceiptHistoryView.
 * Handles category filtering, receipt inspection modal display, and receipt deletion.
 */

export class ReceiptHistoryController {
  /**
   * @param {import('../models/TransactionModel.js').TransactionModel} model
   * @param {import('../views/ReceiptHistoryView.js').ReceiptHistoryView} view
   * @param {import('./TransactionController.js').TransactionController} transactionController
   */
  constructor(model, view, transactionController) {
    this.model = model;
    this.view = view;
    this.transactionController = transactionController;
    this.activeFilter = 'all';
  }

  /**
   * Initializes the Receipt History view and listeners.
   */
  init() {
    this.view.bindCategoryFilter((category) => this.handleFilterChange(category));
    this.view.bindSelectReceipt((id) => this.handleSelectReceipt(id));
    this.view.bindDeleteReceipt((id) => this.handleDeleteReceipt(id));

    this.refreshView();
  }

  /**
   * Handles switching category filter pills.
   * @param {string} category
   */
  handleFilterChange(category) {
    this.activeFilter = category || 'all';
    this.refreshView();
  }

  /**
   * Opens detailed inspection modal for selected receipt.
   * @param {string} id
   */
  handleSelectReceipt(id) {
    const receipt = this.model.getById(id);
    if (receipt) {
      this.view.openModal(receipt);
    }
  }

  /**
   * Deletes receipt transaction and refreshes both history and dashboard.
   * @param {string} id
   */
  handleDeleteReceipt(id) {
    const success = this.model.delete(id);
    if (success) {
      this.refreshView();
      if (this.transactionController) {
        this.transactionController.refreshView();
      }
    }
  }

  /**
   * Refreshes receipt gallery based on current filter.
   */
  refreshView() {
    const receipts = this.model.getReceipts(this.activeFilter);
    this.view.renderReceipts(receipts);

    // Update receipt count badge in header navigation
    const allReceipts = this.model.getReceipts('all');
    const badge = document.getElementById('receiptCountBadge');
    if (badge) {
      badge.textContent = String(allReceipts.length);
    }

    const totalReceiptsStat = document.getElementById('statTotalReceipts');
    if (totalReceiptsStat) {
      totalReceiptsStat.textContent = String(allReceipts.length);
    }
  }
}

/**
 * Receipt History View
 * Role: Renders the Receipt History gallery and the detailed receipt inspection modal
 * (inspired by Screenshot 2). Supports category filtering and receipt deletion.
 * Adheres strictly to MVC: no direct network calls or state modification.
 */

export class ReceiptHistoryView {
  constructor() {
    this.receiptsGrid = document.getElementById('receiptsGrid');
    this.emptyReceiptsState = document.getElementById('emptyReceiptsState');
    this.categoryFilterContainer = document.getElementById('receiptCategoryFilters');
    this.totalReceiptsBadge = document.getElementById('historyReceiptCountBadge');

    // Receipt Detail Modal elements (Screenshot 2)
    this.modal = document.getElementById('receiptDetailModal');
    this.modalCloseBtn = document.getElementById('receiptModalCloseBtn');
    this.modalImage = document.getElementById('receiptModalImg');
    this.modalMerchant = document.getElementById('receiptModalMerchant');
    this.modalDate = document.getElementById('receiptModalDate');
    this.modalCategory = document.getElementById('receiptModalCategory');
    this.modalNote = document.getElementById('receiptModalNote');
    this.modalBreakdownSection = document.getElementById('receiptModalBreakdownSection');
    this.modalBreakdownList = document.getElementById('receiptModalBreakdownList');
    this.modalAmount = document.getElementById('receiptModalAmount');
    this.modalDeleteBtn = document.getElementById('receiptModalDeleteBtn');

    this.activeReceiptId = null;

    this.currencyFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    });

    this.initModalEvents();
  }

  /**
   * Initializes modal dismissal events.
   */
  initModalEvents() {
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }
  }

  /**
   * Formats numeric amount into Indian Rupee string.
   * @param {number} amount
   * @returns {string}
   */
  formatCurrency(amount) {
    return this.currencyFormatter.format(amount || 0);
  }

  /**
   * Renders receipt cards in the grid.
   * Uses textContent to guard against XSS.
   * @param {Array} receipts - List of transactions with receipt images
   */
  renderReceipts(receipts = []) {
    if (!this.receiptsGrid) return;
    this.receiptsGrid.innerHTML = '';

    if (this.totalReceiptsBadge) {
      this.totalReceiptsBadge.textContent = `${receipts.length} receipt${receipts.length === 1 ? '' : 's'}`;
    }

    if (receipts.length === 0) {
      if (this.emptyReceiptsState) this.emptyReceiptsState.classList.remove('hidden');
      return;
    }

    if (this.emptyReceiptsState) this.emptyReceiptsState.classList.add('hidden');

    receipts.forEach(receipt => {
      const card = document.createElement('div');
      card.className = 'receipt-card';
      card.setAttribute('data-id', receipt.id);

      // Top thumbnail
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'receipt-card-thumb';
      const img = document.createElement('img');
      img.src = receipt.receiptImage;
      img.alt = receipt.note || receipt.category || 'Receipt image';
      img.loading = 'lazy';
      thumbWrap.appendChild(img);

      // Card body
      const body = document.createElement('div');
      body.className = 'receipt-card-body';

      const topRow = document.createElement('div');
      topRow.className = 'receipt-card-top';

      const catBadge = document.createElement('span');
      catBadge.className = `category-badge badge-${receipt.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      catBadge.textContent = receipt.category;

      const dateEl = document.createElement('span');
      dateEl.className = 'receipt-card-date';
      const [y, m, d] = receipt.date.split('-');
      const dObj = new Date(Number(y), Number(m) - 1, Number(d));
      dateEl.textContent = dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      topRow.appendChild(catBadge);
      topRow.appendChild(dateEl);

      const titleEl = document.createElement('h4');
      titleEl.className = 'receipt-card-title';
      titleEl.textContent = receipt.note || `${receipt.category} Receipt`;

      const bottomRow = document.createElement('div');
      bottomRow.className = 'receipt-card-bottom';

      const amountEl = document.createElement('div');
      amountEl.className = 'receipt-card-amount';
      amountEl.textContent = this.formatCurrency(receipt.amount);

      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'btn-view-receipt';
      viewBtn.setAttribute('data-id', receipt.id);
      viewBtn.innerHTML = `
        <span>View</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      `;

      bottomRow.appendChild(amountEl);
      bottomRow.appendChild(viewBtn);

      body.appendChild(topRow);
      body.appendChild(titleEl);
      body.appendChild(bottomRow);

      card.appendChild(thumbWrap);
      card.appendChild(body);

      this.receiptsGrid.appendChild(card);
    });
  }

  /**
   * Opens the detailed receipt inspection modal (Screenshot 2).
   * @param {Object} receipt
   */
  openModal(receipt) {
    if (!this.modal || !receipt) return;
    this.activeReceiptId = receipt.id;

    if (this.modalImage) {
      this.modalImage.src = receipt.receiptImage;
    }
    if (this.modalMerchant) {
      let merchantName = receipt.merchant || '';
      if (!merchantName && receipt.note) {
        const parenIdx = receipt.note.indexOf('(');
        const hyphenIdx = receipt.note.indexOf(' - ');
        if (parenIdx > 0) {
          merchantName = receipt.note.substring(0, parenIdx).trim();
        } else if (hyphenIdx > 0) {
          merchantName = receipt.note.substring(0, hyphenIdx).trim();
        } else {
          merchantName = receipt.note;
        }
      }
      this.modalMerchant.textContent = merchantName || `${receipt.category} Merchant`;
    }
    if (this.modalDate) {
      const [y, m, d] = receipt.date.split('-');
      const dObj = new Date(Number(y), Number(m) - 1, Number(d));
      this.modalDate.textContent = dObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    if (this.modalCategory) {
      this.modalCategory.textContent = receipt.category;
      this.modalCategory.className = `category-badge badge-${receipt.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    if (this.modalNote) {
      this.modalNote.textContent = receipt.note || 'No additional note';
    }

    // Render multi-category breakdown if present
    if (this.modalBreakdownSection && this.modalBreakdownList) {
      this.modalBreakdownList.innerHTML = '';
      if (receipt.breakdown && Array.isArray(receipt.breakdown) && receipt.breakdown.length > 0) {
        receipt.breakdown.forEach(item => {
          const row = document.createElement('div');
          row.className = 'modal-breakdown-row';

          const left = document.createElement('div');
          left.className = 'breakdown-row-left';

          const catBadge = document.createElement('span');
          catBadge.className = `category-badge badge-${item.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          catBadge.textContent = item.category;

          const nameEl = document.createElement('span');
          nameEl.className = 'breakdown-row-name';
          nameEl.textContent = item.name;

          left.appendChild(catBadge);
          left.appendChild(nameEl);

          const amtEl = document.createElement('span');
          amtEl.className = 'breakdown-row-amount';
          amtEl.textContent = this.formatCurrency(item.amount);

          row.appendChild(left);
          row.appendChild(amtEl);
          this.modalBreakdownList.appendChild(row);
        });
        this.modalBreakdownSection.classList.remove('hidden');
      } else {
        this.modalBreakdownSection.classList.add('hidden');
      }
    }

    if (this.modalAmount) {
      this.modalAmount.textContent = this.formatCurrency(receipt.amount);
    }
    if (this.modalDeleteBtn) {
      this.modalDeleteBtn.setAttribute('data-id', receipt.id);
    }

    this.modal.classList.remove('hidden');
  }

  /**
   * Closes the receipt inspection modal.
   */
  closeModal() {
    if (this.modal) {
      this.modal.classList.add('hidden');
      this.activeReceiptId = null;
    }
  }

  /**
   * Binds category filter pill clicks.
   * @param {Function} handler
   */
  bindCategoryFilter(handler) {
    if (this.categoryFilterContainer) {
      this.categoryFilterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-filter-btn');
        if (btn) {
          const category = btn.getAttribute('data-category');
          // Update active state
          this.categoryFilterContainer.querySelectorAll('.cat-filter-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          handler(category);
        }
      });
    }
  }

  /**
   * Binds clicking on receipt card / view button to open detail modal.
   * @param {Function} handler
   */
  bindSelectReceipt(handler) {
    if (this.receiptsGrid) {
      this.receiptsGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.receipt-card');
        if (card) {
          const id = card.getAttribute('data-id');
          if (id) handler(id);
        }
      });
    }
  }

  /**
   * Binds delete button inside receipt modal.
   * @param {Function} handler
   */
  bindDeleteReceipt(handler) {
    if (this.modalDeleteBtn) {
      this.modalDeleteBtn.addEventListener('click', () => {
        if (this.activeReceiptId) {
          const idToDelete = this.activeReceiptId;
          this.closeModal();
          handler(idToDelete);
        }
      });
    }
  }
}

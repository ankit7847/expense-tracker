/**
 * Transaction Controller
 * Role: Handles CRUD operations for persistent transactions in the database.
 * Enforces authenticated user ownership on all endpoints.
 */

import { TransactionModel } from '../models/Transaction.js';

export class TransactionController {
  /**
   * Retrieves transactions for the logged-in user.
   * GET /api/transactions?month=YYYY-MM
   */
  static async getAll(req, res) {
    try {
      const month = req.query.month || null;
      const transactions = await TransactionModel.getByUserId(req.user.id, month);
      return res.status(200).json({ transactions });
    } catch (err) {
      console.error('Fetch transactions error:', err);
      return res.status(500).json({ error: 'Failed to retrieve transactions.' });
    }
  }

  /**
   * Adds a new transaction for the logged-in user.
   * POST /api/transactions
   */
  static async create(req, res) {
    try {
      const { type, amount, category, date, note, receiptImage, breakdown } = req.body;

      if (!type || !['expense', 'income'].includes(type)) {
        return res.status(400).json({ error: 'Transaction type must be income or expense.' });
      }

      const numAmount = Number(amount);
      if (!amount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number.' });
      }

      if (!category) {
        return res.status(400).json({ error: 'Category is required.' });
      }

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required.' });
      }

      const transaction = await TransactionModel.create({
        userId: req.user.id,
        type,
        amount: numAmount,
        category,
        date,
        note,
        receiptImage,
        breakdown
      });

      return res.status(201).json({
        message: 'Transaction saved successfully.',
        transaction
      });
    } catch (err) {
      console.error('Create transaction error:', err);
      return res.status(500).json({ error: 'Failed to save transaction.' });
    }
  }

  /**
   * Deletes a transaction owned by the logged-in user.
   * DELETE /api/transactions/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const success = await TransactionModel.delete(id, req.user.id);

      if (!success) {
        return res.status(404).json({ error: 'Transaction not found or unauthorized.' });
      }

      return res.status(200).json({ message: 'Transaction deleted successfully.' });
    } catch (err) {
      console.error('Delete transaction error:', err);
      return res.status(500).json({ error: 'Failed to delete transaction.' });
    }
  }

  /**
   * Bulk syncs multiple transactions (e.g. migrating local guest/demo data to user account).
   * POST /api/transactions/sync
   */
  static async sync(req, res) {
    try {
      const { transactions } = req.body;
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: 'Transactions array is required.' });
      }

      const saved = [];
      for (const item of transactions) {
        if (item.amount && item.category && item.date) {
          const tx = await TransactionModel.create({
            userId: req.user.id,
            type: item.type || 'expense',
            amount: Number(item.amount),
            category: item.category,
            date: item.date,
            note: item.note || '',
            receiptImage: item.receiptImage || null,
            breakdown: item.breakdown || null
          });
          saved.push(tx);
        }
      }

      return res.status(200).json({
        message: `Synced ${saved.length} transactions successfully.`,
        syncedCount: saved.length
      });
    } catch (err) {
      console.error('Sync transactions error:', err);
      return res.status(500).json({ error: 'Failed to sync transactions.' });
    }
  }
}

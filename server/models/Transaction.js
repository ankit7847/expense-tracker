/**
 * Transaction Server Model
 * Role: Manages persistent transaction records in the database (MongoDB or SQLite).
 * Enforces user isolation so each user only accesses their own transactions.
 */

import mongoose from 'mongoose';
import { getDbType, getSqliteDb } from '../config/db.js';

// MongoDB Schema
const MongoTransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  note: { type: String, default: '' },
  receiptImage: { type: String, default: null },
  breakdown: { type: Array, default: null },
  createdAt: { type: Date, default: Date.now }
});

const MongoTransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', MongoTransactionSchema);

export class TransactionModel {
  /**
   * Retrieves all transactions for a user, optionally filtered by month (YYYY-MM).
   * @param {string} userId
   * @param {string} [yearMonth] - 'YYYY-MM'
   * @returns {Promise<Array>}
   */
  static async getByUserId(userId, yearMonth = null) {
    if (!userId) return [];

    if (getDbType() === 'mongodb') {
      const query = { userId };
      if (yearMonth) {
        query.date = { $regex: `^${yearMonth}` };
      }
      const list = await MongoTransactionModel.find(query).sort({ date: -1, createdAt: -1 });
      return list.map(item => ({
        id: item._id.toString(),
        userId: item.userId,
        type: item.type,
        amount: item.amount,
        category: item.category,
        date: item.date,
        note: item.note,
        receiptImage: item.receiptImage,
        breakdown: item.breakdown,
        createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now()
      }));
    } else {
      const db = getSqliteDb();
      let rows;
      if (yearMonth) {
        rows = db.prepare(`
          SELECT * FROM transactions
          WHERE userId = ? AND date LIKE ?
          ORDER BY date DESC, createdAt DESC
        `).all(userId, `${yearMonth}%`);
      } else {
        rows = db.prepare(`
          SELECT * FROM transactions
          WHERE userId = ?
          ORDER BY date DESC, createdAt DESC
        `).all(userId);
      }

      return rows.map(r => ({
        id: r.id,
        userId: r.userId,
        type: r.type,
        amount: Number(r.amount),
        category: r.category,
        date: r.date,
        note: r.note || '',
        receiptImage: r.receiptImage || null,
        breakdown: r.breakdown ? JSON.parse(r.breakdown) : null,
        createdAt: Number(r.createdAt)
      }));
    }
  }

  /**
   * Creates a new transaction for a user.
   * @param {Object} txData
   * @returns {Promise<Object>}
   */
  static async create({ userId, type, amount, category, date, note, receiptImage, breakdown }) {
    if (!userId) throw new Error('User ID is required');

    const cleanAmount = parseFloat(Number(amount).toFixed(2));
    const cleanNote = typeof note === 'string' ? note.trim() : '';

    if (getDbType() === 'mongodb') {
      const tx = await MongoTransactionModel.create({
        userId,
        type,
        amount: cleanAmount,
        category,
        date,
        note: cleanNote,
        receiptImage: receiptImage || null,
        breakdown: Array.isArray(breakdown) ? breakdown : null
      });

      return {
        id: tx._id.toString(),
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        date: tx.date,
        note: tx.note,
        receiptImage: tx.receiptImage,
        breakdown: tx.breakdown,
        createdAt: new Date(tx.createdAt).getTime()
      };
    } else {
      const db = getSqliteDb();
      const id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const createdAt = Date.now();
      const breakdownJson = Array.isArray(breakdown) ? JSON.stringify(breakdown) : null;

      db.prepare(`
        INSERT INTO transactions (id, userId, type, amount, category, date, note, receiptImage, breakdown, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, type, cleanAmount, category, date, cleanNote, receiptImage || null, breakdownJson, createdAt);

      return {
        id,
        userId,
        type,
        amount: cleanAmount,
        category,
        date,
        note: cleanNote,
        receiptImage: receiptImage || null,
        breakdown: Array.isArray(breakdown) ? breakdown : null,
        createdAt
      };
    }
  }

  /**
   * Deletes a transaction owned by a specific user.
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  static async delete(id, userId) {
    if (!id || !userId) return false;

    if (getDbType() === 'mongodb') {
      const result = await MongoTransactionModel.deleteOne({ _id: id, userId });
      return result.deletedCount > 0;
    } else {
      const db = getSqliteDb();
      const info = db.prepare('DELETE FROM transactions WHERE id = ? AND userId = ?').run(id, userId);
      return info.changes > 0;
    }
  }
}

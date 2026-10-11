/**
 * Database Visualizer CLI Tool
 * Role: Prints a clean, human-readable summary of all tables and records
 * in the active database (SQLite or MongoDB Atlas).
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DB_PATH = path.join(ROOT_DIR, 'data', 'expense_tracker.sqlite');

async function viewDatabase() {
  console.log('\n======================================================');
  console.log('       📊 EXPENSE TRACKER - DATABASE VIEWER');
  console.log('======================================================\n');

  if (!fs.existsSync(DB_PATH)) {
    console.log(`❌ Database file not found at: ${DB_PATH}`);
    console.log('Start the server first (npm start) to automatically initialize it.\n');
    return;
  }

  console.log(`📁 Database Location: ${DB_PATH}\n`);

  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(DB_PATH);

    // 1. Users Table
    console.log('------------------------------------------------------');
    console.log('👤 USERS TABLE:');
    console.log('------------------------------------------------------');
    const users = db.prepare("SELECT id, name, email, datetime(createdAt/1000, 'unixepoch', 'localtime') as joinedAt FROM users").all();
    
    if (users.length === 0) {
      console.log('No registered users yet.\n');
    } else {
      console.table(users);
      console.log(`Total Users: ${users.length}\n`);
    }

    // 2. Transactions Table
    console.log('------------------------------------------------------');
    console.log('💳 TRANSACTIONS TABLE (Most recent 15):');
    console.log('------------------------------------------------------');
    const transactions = db.prepare(`
      SELECT 
        id, 
        userId,
        type, 
        printf('₹%.2f', amount) as amount, 
        category, 
        date, 
        SUBSTR(note, 1, 30) as description 
      FROM transactions 
      ORDER BY date DESC 
      LIMIT 15
    `).all();

    if (transactions.length === 0) {
      console.log('No transactions found in database.\n');
    } else {
      console.table(transactions);
      
      const countRes = db.prepare("SELECT count(*) as count, sum(case when type='expense' then amount else 0 end) as totalExpense, sum(case when type='income' then amount else 0 end) as totalIncome FROM transactions").get();
      console.log(`Total Records: ${countRes.count}`);
      console.log(`Total Income:  ₹${(countRes.totalIncome || 0).toLocaleString('en-IN')}`);
      console.log(`Total Expense: ₹${(countRes.totalExpense || 0).toLocaleString('en-IN')}\n`);
    }

    console.log('======================================================');
    console.log('💡 Tip: You can also open "data/expense_tracker.sqlite" in');
    console.log('   free visual viewers like "DB Browser for SQLite"');
    console.log('   or the "SQLite Viewer" VS Code extension.');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Error reading SQLite database:', err.message);
  }
}

viewDatabase();

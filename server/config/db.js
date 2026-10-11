/**
 * Unified Database Configuration & Initialization
 * Role: Provides seamless dual-engine database support:
 * 1. MongoDB Atlas via Mongoose (when MONGODB_URI is provided in .env, ideal for cloud Render deployments)
 * 2. High-performance embedded SQLite via native node:sqlite (when MONGODB_URI is absent, zero setup needed locally)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');

let dbType = 'sqlite';
let sqliteDb = null;

/**
 * Initializes the database connection (MongoDB or SQLite).
 * @returns {Promise<{ dbType: string, db: any }>}
 */
export async function initDb() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (mongoUri && mongoUri.trim() && !mongoUri.includes('your_mongodb_connection_string')) {
    try {
      console.log('Connecting to MongoDB Atlas at:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000
      });
      dbType = 'mongodb';
      console.log('Connected to MongoDB successfully.');
      return { dbType, db: mongoose.connection };
    } catch (err) {
      console.warn('Could not connect to MongoDB URI, falling back to embedded SQLite:', err.message);
    }
  }

  // Fallback to native node:sqlite
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const dbPath = path.join(DATA_DIR, 'expense_tracker.sqlite');
    const { DatabaseSync } = await import('node:sqlite');
    sqliteDb = new DatabaseSync(dbPath);

    // Create users table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );
    `);

    // Create transactions table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        receiptImage TEXT,
        breakdown TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    dbType = 'sqlite';
    console.log(`Initialized embedded SQLite database at: ${dbPath}`);
    return { dbType, db: sqliteDb };
  } catch (sqliteErr) {
    console.error('Failed to initialize SQLite database:', sqliteErr);
    throw sqliteErr;
  }
}

/**
 * Returns current active database type ('mongodb' | 'sqlite').
 * @returns {string}
 */
export function getDbType() {
  return dbType;
}

/**
 * Returns the SQLite instance if active.
 */
export function getSqliteDb() {
  return sqliteDb;
}

/**
 * Server Main Entry Point
 * Role: Sets up Express, initializes dual-engine database (MongoDB Atlas or embedded SQLite),
 * mounts Auth, Transactions, and AI routes, and serves the frontend application.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import { initDb, getDbType } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import aiRoutes from './routes/ai.routes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for cross-origin flexibility
app.use(cors());

// Enable JSON parser with 10mb limit for receipt image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files from /public directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Mount REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', aiRoutes);

// Health check endpoint (used by Render health probes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: getDbType(),
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// Single-page application route fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Initialize database then start server
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Expense Tracker server running on port ${PORT} [DB: ${getDbType()}]`);
      console.log(`Local Access: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Fatal: Failed to initialize database:', err);
    process.exit(1);
  });

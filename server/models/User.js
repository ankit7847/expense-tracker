/**
 * User Model
 * Role: Manages user records, registration, password hashing with bcryptjs,
 * and user lookup. Seamlessly supports MongoDB and SQLite.
 */

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { getDbType, getSqliteDb } from '../config/db.js';

// MongoDB User Schema
const MongoUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MongoUserModel = mongoose.models.User || mongoose.model('User', MongoUserSchema);

export class UserModel {
  /**
   * Hashes a plaintext password with bcrypt.
   * @param {string} password
   * @returns {Promise<string>}
   */
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compares plaintext password against bcrypt hash.
   * @param {string} password
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  static async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Finds a user by email address.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    if (getDbType() === 'mongodb') {
      const user = await MongoUserModel.findOne({ email: cleanEmail });
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        password: user.password,
        createdAt: user.createdAt
      };
    } else {
      const db = getSqliteDb();
      const row = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password,
        createdAt: row.createdAt
      };
    }
  }

  /**
   * Finds a user by unique ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    if (!id) return null;

    if (getDbType() === 'mongodb') {
      const user = await MongoUserModel.findById(id);
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      };
    } else {
      const db = getSqliteDb();
      const row = db.prepare('SELECT id, name, email, createdAt FROM users WHERE id = ?').get(id);
      return row || null;
    }
  }

  /**
   * Creates a new user record.
   * @param {Object} userData - { name, email, password }
   * @returns {Promise<Object>}
   */
  static async create({ name, email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const hashedPassword = await this.hashPassword(password);

    if (getDbType() === 'mongodb') {
      const user = await MongoUserModel.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword
      });
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      };
    } else {
      const db = getSqliteDb();
      const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const createdAt = Date.now();

      db.prepare(`
        INSERT INTO users (id, name, email, password, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, cleanName, cleanEmail, hashedPassword, createdAt);

      return {
        id,
        name: cleanName,
        email: cleanEmail,
        createdAt
      };
    }
  }
}

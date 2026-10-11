/**
 * Authentication Controller
 * Role: Handles user registration, login, and profile fetching.
 */

import { UserModel } from '../models/User.js';
import { generateToken } from '../middleware/auth.middleware.js';

export class AuthController {
  /**
   * Registers a new user.
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      }

      const user = await UserModel.create({ name, email, password });
      const token = generateToken(user);

      return res.status(201).json({
        message: 'Account created successfully.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
  }

  /**
   * Logs in an existing user.
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await UserModel.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken(user);

      return res.status(200).json({
        message: 'Logged in successfully.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Failed to log in. Please try again.' });
    }
  }

  /**
   * Retrieves the currently authenticated user's profile.
   * GET /api/auth/me
   */
  static async getMe(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (err) {
      console.error('Get profile error:', err);
      return res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
  }
}

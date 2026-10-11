/**
 * Authentication Middleware
 * Role: Validates JSON Web Tokens (JWT) on protected API routes.
 * Enforces user authentication and attaches the authenticated user profile to req.user.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity_expense_tracker_secret_key_2026';

/**
 * Middleware requiring valid JWT authentication.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please log in or create an account.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Session expired or invalid token. Please log in again.'
    });
  }
}

/**
 * Optional authentication middleware: attaches user if token is valid, continues otherwise.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      // Ignore token errors for optional auth
    }
  }
  next();
}

/**
 * Helper to generate a new JWT for an authenticated user.
 * @param {Object} user - { id, email, name }
 * @returns {string} Signed JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

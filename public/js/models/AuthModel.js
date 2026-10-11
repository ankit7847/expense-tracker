/**
 * Auth Model
 * Role: Manages client-side authentication state, JWT storage,
 * and calls the /api/auth REST endpoints.
 * Never touches the DOM.
 */

const TOKEN_KEY = 'expense_tracker_auth_token_v1';
const USER_KEY = 'expense_tracker_auth_user_v1';

export class AuthModel {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY) || null;
    this.user = this.loadUser();
  }

  /**
   * Loads cached user object from localStorage.
   * @returns {Object|null}
   */
  loadUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Returns current active JWT token.
   * @returns {string|null}
   */
  getToken() {
    return this.token;
  }

  /**
   * Returns current logged-in user profile.
   * @returns {Object|null}
   */
  getUser() {
    return this.user;
  }

  /**
   * Checks whether the user is currently authenticated.
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this.token && this.user);
  }

  /**
   * Sets authentication credentials in state and storage.
   * @param {string} token
   * @param {Object} user
   */
  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Clears authentication session.
   */
  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Registers a new account.
   * @param {Object} credentials - { name, email, password }
   * @returns {Promise<Object>}
   */
  async register({ name, email, password }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account.');
    }

    this.setSession(data.token, data.user);
    return data.user;
  }

  /**
   * Logs in an existing user.
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>}
   */
  async login({ email, password }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid email or password.');
    }

    this.setSession(data.token, data.user);
    return data.user;
  }

  /**
   * Verifies existing token validity with backend.
   * @returns {Promise<boolean>}
   */
  async verifySession() {
    if (!this.token) return false;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (!res.ok) {
        this.clearSession();
        return false;
      }

      const data = await res.json();
      this.user = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return true;
    } catch {
      // In offline mode, preserve local session
      return Boolean(this.user);
    }
  }
}
